import { Hono } from 'hono';
import { cors } from "hono/cors";
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, like, desc } from 'drizzle-orm';
import { users, habits, habitCompletions, expenses, budgets, journalEntries } from './database/schema';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';

type Env = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('api');

app.use(cors({ origin: "*" }));

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const secret = c.env.JWT_SECRET || 'life-tracker-secret-2024';
    const payload = await verify(token, secret, 'HS256') as any;
    c.set('userId', payload.userId);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// ─── AUTH ───────────────────────────────────────────────────────────────────

app.post('/auth/register', async (c) => {
  try {
    const { email, name, password } = await c.req.json();
    if (!email || !name || !password) return c.json({ error: 'Missing fields' }, 400);
    const db = drizzle(c.env.DB);
    const existing = await db.select().from(users).where(eq(users.email, email)).get();
    if (existing) return c.json({ error: 'Email already registered' }, 409);
    const passwordHash = await bcrypt.hash(password, 10);
    const id = createId();
    await db.insert(users).values({ id, email, name, passwordHash });
    const secret = c.env.JWT_SECRET || 'life-tracker-secret-2024';
    const token = await sign({ userId: id, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);
    return c.json({ token, user: { id, email, name } });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const db = drizzle(c.env.DB);
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    const secret = c.env.JWT_SECRET || 'life-tracker-secret-2024';
    const token = await sign({ userId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);
    return c.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/auth/profile', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const user = await db.select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
    .from(users).where(eq(users.id, c.get('userId'))).get();
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json(user);
});

// ─── HABITS ─────────────────────────────────────────────────────────────────

app.get('/habits', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const rows = await db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
  return c.json(rows);
});

app.post('/habits', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const id = createId();
  const habit = { id, userId, name: body.name, description: body.description || null, category: body.category || 'Other', frequency: body.frequency || 'daily', targetDays: body.targetDays ? JSON.stringify(body.targetDays) : null, isActive: true };
  await db.insert(habits).values(habit);
  return c.json(habit, 201);
});

app.put('/habits/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  await db.update(habits).set({ name: body.name, description: body.description, category: body.category, frequency: body.frequency }).where(and(eq(habits.id, c.req.param('id')), eq(habits.userId, userId)));
  return c.json({ success: true });
});

app.delete('/habits/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  await db.update(habits).set({ isActive: false }).where(and(eq(habits.id, c.req.param('id')), eq(habits.userId, userId)));
  return c.json({ success: true });
});

app.post('/habits/:id/complete', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const habitId = c.req.param('id');
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.select().from(habitCompletions).where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.userId, userId), eq(habitCompletions.date, today))).get();
  if (existing) {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id));
    return c.json({ completed: false });
  }
  await db.insert(habitCompletions).values({ id: createId(), habitId, userId, date: today });
  return c.json({ completed: true });
});

app.get('/habits/completions', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const since = c.req.query('since') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rows = await db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, since)));
  return c.json(rows);
});

// ─── EXPENSES ────────────────────────────────────────────────────────────────

app.get('/expenses', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const month = c.req.query('month');
  let query = db.select().from(expenses).where(eq(expenses.userId, userId)).$dynamic();
  if (month) {
    query = query.where(and(eq(expenses.userId, userId), gte(expenses.date, `${month}-01`), lte(expenses.date, `${month}-31`)));
  }
  const rows = await query.orderBy(desc(expenses.date));
  return c.json(rows);
});

app.post('/expenses', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const id = createId();
  const expense = { id, userId, amount: body.amount, category: body.category, description: body.description || null, date: body.date || new Date().toISOString().split('T')[0], isRecurring: body.isRecurring || false, recurringFrequency: body.recurringFrequency || null };
  await db.insert(expenses).values(expense);
  return c.json(expense, 201);
});

app.put('/expenses/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  await db.update(expenses).set({ amount: body.amount, category: body.category, description: body.description, date: body.date }).where(and(eq(expenses.id, c.req.param('id')), eq(expenses.userId, userId)));
  return c.json({ success: true });
});

app.delete('/expenses/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  await db.delete(expenses).where(and(eq(expenses.id, c.req.param('id')), eq(expenses.userId, userId)));
  return c.json({ success: true });
});

// ─── BUDGETS ─────────────────────────────────────────────────────────────────

app.get('/budgets', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const month = c.req.query('month') || new Date().toISOString().slice(0, 7);
  const rows = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
  return c.json(rows);
});

app.put('/budgets/:category', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const month = body.month || new Date().toISOString().slice(0, 7);
  const category = decodeURIComponent(c.req.param('category'));
  const existing = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.category, category), eq(budgets.month, month))).get();
  if (existing) {
    await db.update(budgets).set({ amount: body.amount }).where(eq(budgets.id, existing.id));
  } else {
    await db.insert(budgets).values({ id: createId(), userId, category, amount: body.amount, month });
  }
  return c.json({ success: true });
});

// ─── JOURNAL ─────────────────────────────────────────────────────────────────

app.get('/journal', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const search = c.req.query('search');
  let rows;
  if (search) {
    rows = await db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), like(journalEntries.content, `%${search}%`))).orderBy(desc(journalEntries.createdAt));
  } else {
    rows = await db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt));
  }
  return c.json(rows);
});

app.post('/journal', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const id = createId();
  const entry = { id, userId, title: body.title || null, content: body.content, mood: body.mood || 'neutral', tags: body.tags ? JSON.stringify(body.tags) : null };
  await db.insert(journalEntries).values(entry);
  return c.json(entry, 201);
});

app.put('/journal/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  await db.update(journalEntries).set({ title: body.title, content: body.content, mood: body.mood, tags: body.tags ? JSON.stringify(body.tags) : null, updatedAt: new Date().toISOString() }).where(and(eq(journalEntries.id, c.req.param('id')), eq(journalEntries.userId, userId)));
  return c.json({ success: true });
});

app.delete('/journal/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  await db.delete(journalEntries).where(and(eq(journalEntries.id, c.req.param('id')), eq(journalEntries.userId, userId)));
  return c.json({ success: true });
});

// ─── DASHBOARD SUMMARY ───────────────────────────────────────────────────────

app.get('/dashboard', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [allHabits, todayCompletions, monthExpenses, todayJournal, recentEntries] = await Promise.all([
    db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, today))),
    db.select().from(expenses).where(and(eq(expenses.userId, userId), gte(expenses.date, `${month}-01`), lte(expenses.date, `${month}-31`))),
    db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), gte(journalEntries.createdAt, today))).get(),
    db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt)).limit(3),
  ]);

  const totalMonthSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const todaySpend = monthExpenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);

  return c.json({
    habits: { total: allHabits.length, completedToday: todayCompletions.length, list: allHabits, completedIds: todayCompletions.map(c => c.habitId) },
    expenses: { totalMonth: totalMonthSpend, today: todaySpend, recentExpenses: monthExpenses.slice(0, 5) },
    journal: { todayMood: todayJournal?.mood || null, recentEntries },
  });
});

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));

export default app;
