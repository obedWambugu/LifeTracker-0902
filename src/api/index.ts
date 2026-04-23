import { Hono } from 'hono';
import { cors } from "hono/cors";
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, like, desc, sql, count, inArray } from 'drizzle-orm';
import { users, habits, habitCompletions, expenses, budgets, journalEntries, userPreferences } from './database/schema';
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
    return c.json({ token, user: { id, email, name, onboarded: false, isPremium: false, premiumUntil: null } });
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
    const premiumActive = user.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());
    return c.json({ token, user: { id: user.id, email: user.email, name: user.name, onboarded: user.onboarded, isPremium: premiumActive, premiumUntil: user.premiumUntil } });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/auth/profile', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const user = await db.select({ id: users.id, email: users.email, name: users.name, onboarded: users.onboarded, isPremium: users.isPremium, premiumUntil: users.premiumUntil, createdAt: users.createdAt })
    .from(users).where(eq(users.id, c.get('userId'))).get();
  if (!user) return c.json({ error: 'Not found' }, 404);
  const premiumActive = user.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());
  return c.json({ ...user, isPremium: premiumActive });
});

// ─── ADMIN: TOGGLE PREMIUM ──────────────────────────────────────────────────

app.post('/admin/set-premium', async (c) => {
  const db = drizzle(c.env.DB);
  const adminKey = c.req.header('X-Admin-Key');
  const secret = c.env.JWT_SECRET || 'life-tracker-secret-2024';
  if (adminKey !== secret) return c.json({ error: 'Unauthorized' }, 401);

  const { email, isPremium, months } = await c.req.json();
  if (!email) return c.json({ error: 'Email required' }, 400);

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return c.json({ error: 'User not found' }, 404);

  const premiumUntil = isPremium !== false
    ? new Date(Date.now() + (months || 1) * 30 * 86400000).toISOString()
    : null;

  await db.update(users).set({
    isPremium: isPremium !== false,
    premiumUntil,
  }).where(eq(users.id, user.id));

  return c.json({ success: true, email, isPremium: isPremium !== false, premiumUntil });
});

// ─── SUBSCRIPTION STATUS ────────────────────────────────────────────────────

app.get('/subscription', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const user = await db.select({ isPremium: users.isPremium, premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);
  const premiumActive = user.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());
  return c.json({ isPremium: premiumActive, premiumUntil: user.premiumUntil });
});

// ─── ONBOARDING SEED ────────────────────────────────────────────────────────

app.post('/onboarding/seed', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');

  // Check if already onboarded
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (user?.onboarded) return c.json({ message: 'Already onboarded' });

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const sub = (days: number) => new Date(today.getTime() - days * 86400000);

  // Create sample habits
  const sampleHabits = [
    { id: createId(), userId, name: 'Morning Exercise', description: '30 minutes of workout', category: 'Health', frequency: 'daily', isActive: true },
    { id: createId(), userId, name: 'Read for 20 mins', description: 'Read a book or article', category: 'Learning', frequency: 'daily', isActive: true },
    { id: createId(), userId, name: 'Drink 8 glasses of water', description: 'Stay hydrated', category: 'Health', frequency: 'daily', isActive: true },
    { id: createId(), userId, name: 'Meditate', description: '10 minutes of mindfulness', category: 'Wellness', frequency: 'daily', isActive: true },
    { id: createId(), userId, name: 'Practice gratitude', description: 'Write 3 things you are grateful for', category: 'Wellness', frequency: 'daily', isActive: true },
  ];

  for (const h of sampleHabits) {
    await db.insert(habits).values(h);
  }

  // Create sample completions for last 7 days
  for (let i = 1; i <= 7; i++) {
    const date = fmt(sub(i));
    // Randomly complete 2-4 habits per day
    const numComplete = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...sampleHabits].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numComplete; j++) {
      await db.insert(habitCompletions).values({ id: createId(), habitId: shuffled[j].id, userId, date });
    }
  }

  // Create sample expenses
  const expenseCategories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health'];
  const sampleExpenses = [
    { amount: 12.50, category: 'Food', description: 'Lunch at cafe' },
    { amount: 3.00, category: 'Transport', description: 'Bus fare' },
    { amount: 45.00, category: 'Shopping', description: 'New notebook & pens' },
    { amount: 8.00, category: 'Food', description: 'Coffee & snacks' },
    { amount: 25.00, category: 'Entertainment', description: 'Movie night' },
    { amount: 15.00, category: 'Health', description: 'Multivitamins' },
    { amount: 200.00, category: 'Bills', description: 'Electricity bill' },
    { amount: 5.50, category: 'Transport', description: 'Matatu fare' },
    { amount: 30.00, category: 'Food', description: 'Grocery shopping' },
    { amount: 10.00, category: 'Entertainment', description: 'Spotify subscription' },
  ];
  for (let i = 0; i < sampleExpenses.length; i++) {
    const e = sampleExpenses[i];
    await db.insert(expenses).values({ id: createId(), userId, amount: e.amount, category: e.category, description: e.description, date: fmt(sub(i % 7)) });
  }

  // Create sample journal entries
  const journals = [
    { title: 'A productive Monday', content: 'Started the week strong. Managed to hit all my habits and felt really energized. The morning run was especially refreshing.', mood: 'excellent', tags: JSON.stringify(['productivity', 'exercise']) },
    { title: 'Reflections on spending', content: 'Noticed I spent too much on eating out this week. Need to meal prep more. Set a goal to cook at least 4 days next week.', mood: 'neutral', tags: JSON.stringify(['finance', 'goals']) },
    { title: 'Grateful for small wins', content: 'Today I completed my meditation streak for 7 days straight. Its amazing how small consistent actions compound over time.', mood: 'good', tags: JSON.stringify(['gratitude', 'mindfulness']) },
  ];
  for (let i = 0; i < journals.length; i++) {
    const j = journals[i];
    await db.insert(journalEntries).values({ id: createId(), userId, title: j.title, content: j.content, mood: j.mood, tags: j.tags, createdAt: sub(i).toISOString() });
  }

  // Create default preferences
  await db.insert(userPreferences).values({ id: createId(), userId, remindersEnabled: false, reminderTime: '20:00', weeklyReportEnabled: true, streakFreezePerWeek: 1 });

  // Mark as onboarded
  await db.update(users).set({ onboarded: true }).where(eq(users.id, userId));

  return c.json({ success: true, message: 'Sample data created!' });
});

app.post('/onboarding/skip', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  await db.update(users).set({ onboarded: true }).where(eq(users.id, userId));
  // Ensure preferences exist
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
  if (!existing) {
    await db.insert(userPreferences).values({ id: createId(), userId, remindersEnabled: false, reminderTime: '20:00', weeklyReportEnabled: true, streakFreezePerWeek: 1 });
  }
  return c.json({ success: true });
});

// ─── PREFERENCES / REMINDERS ────────────────────────────────────────────────

app.get('/preferences', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  let prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
  if (!prefs) {
    const id = createId();
    await db.insert(userPreferences).values({ id, userId, remindersEnabled: false, reminderTime: '20:00', weeklyReportEnabled: true, streakFreezePerWeek: 1 });
    prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
  }
  return c.json(prefs);
});

app.put('/preferences', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
  if (existing) {
    await db.update(userPreferences).set({
      remindersEnabled: body.remindersEnabled ?? existing.remindersEnabled,
      reminderTime: body.reminderTime ?? existing.reminderTime,
      weeklyReportEnabled: body.weeklyReportEnabled ?? existing.weeklyReportEnabled,
      streakFreezePerWeek: body.streakFreezePerWeek ?? existing.streakFreezePerWeek,
    }).where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({ id: createId(), userId, ...body });
  }
  return c.json({ success: true });
});

// ─── INSIGHTS / CORRELATIONS ────────────────────────────────────────────────

app.get('/insights', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');

  // Premium-only feature
  const user = await db.select({ isPremium: users.isPremium, premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId)).get();
  const premiumActive = user?.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());
  if (!premiumActive) {
    return c.json([{ type: 'upgrade', title: 'Unlock Insights', description: 'Upgrade to Pro to see correlations between your habits, spending, and mood.', color: '#00ff88' }]);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Get data for last 30 days
  const [completions, allExpenses, journals, allHabits] = await Promise.all([
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, thirtyDaysAgo))),
    db.select().from(expenses).where(and(eq(expenses.userId, userId), gte(expenses.date, thirtyDaysAgo))),
    db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), gte(journalEntries.createdAt, thirtyDaysAgo))),
    db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
  ]);

  const insights: { type: string; title: string; description: string; color: string }[] = [];

  // Group completions by date
  const completionsByDate: Record<string, number> = {};
  completions.forEach(c => { completionsByDate[c.date] = (completionsByDate[c.date] || 0) + 1; });

  // Group expenses by date
  const expensesByDate: Record<string, number> = {};
  allExpenses.forEach(e => { expensesByDate[e.date] = (expensesByDate[e.date] || 0) + e.amount; });

  // Group journal moods by date
  const moodByDate: Record<string, string> = {};
  journals.forEach(j => {
    const d = j.createdAt?.split('T')[0] || '';
    if (d) moodByDate[d] = j.mood;
  });

  const moodScores: Record<string, number> = { excellent: 5, good: 4, neutral: 3, poor: 2, terrible: 1 };

  // Insight 1: Habit completion vs spending
  const allDates = new Set([...Object.keys(completionsByDate), ...Object.keys(expensesByDate)]);
  let highHabitSpend = 0, highHabitDays = 0;
  let lowHabitSpend = 0, lowHabitDays = 0;
  const medianCompletion = allHabits.length > 0 ? Math.ceil(allHabits.length / 2) : 1;

  allDates.forEach(date => {
    const comps = completionsByDate[date] || 0;
    const spend = expensesByDate[date] || 0;
    if (comps >= medianCompletion) { highHabitSpend += spend; highHabitDays++; }
    else { lowHabitSpend += spend; lowHabitDays++; }
  });

  if (highHabitDays > 0 && lowHabitDays > 0) {
    const avgHighDay = highHabitSpend / highHabitDays;
    const avgLowDay = lowHabitSpend / lowHabitDays;
    const pctDiff = Math.round(((avgLowDay - avgHighDay) / avgLowDay) * 100);
    if (pctDiff > 5) {
      insights.push({
        type: 'correlation',
        title: 'Habits Save Money',
        description: `On days you complete ${medianCompletion}+ habits, you spend ${pctDiff}% less on average.`,
        color: '#00ff88'
      });
    } else if (pctDiff < -5) {
      insights.push({
        type: 'correlation',
        title: 'Active Days Cost More',
        description: `On productive habit days, you tend to spend ${Math.abs(pctDiff)}% more — maybe healthy food or gym costs?`,
        color: '#ffa502'
      });
    }
  }

  // Insight 2: Habits vs mood
  const moodDates = Object.keys(moodByDate);
  let happyHabits = 0, happyDays = 0;
  let sadHabits = 0, sadDays = 0;
  moodDates.forEach(date => {
    const score = moodScores[moodByDate[date]] || 3;
    const comps = completionsByDate[date] || 0;
    if (score >= 4) { happyHabits += comps; happyDays++; }
    else if (score <= 2) { sadHabits += comps; sadDays++; }
  });

  if (happyDays > 0 && sadDays > 0) {
    const avgHappy = (happyHabits / happyDays).toFixed(1);
    const avgSad = (sadHabits / sadDays).toFixed(1);
    insights.push({
      type: 'correlation',
      title: 'Mood & Habits Link',
      description: `On good mood days, you complete ${avgHappy} habits vs ${avgSad} on low days.`,
      color: '#5352ed'
    });
  }

  // Insight 3: Most consistent habit
  if (completions.length > 0 && allHabits.length > 0) {
    const habitCounts: Record<string, number> = {};
    completions.forEach(c => { habitCounts[c.habitId] = (habitCounts[c.habitId] || 0) + 1; });
    const topId = Object.entries(habitCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
    const topHabit = allHabits.find(h => h.id === topId);
    if (topHabit) {
      insights.push({
        type: 'streak',
        title: 'Most Consistent',
        description: `"${topHabit.name}" is your most completed habit with ${habitCounts[topId]} completions in 30 days.`,
        color: '#00ff88'
      });
    }
  }

  // Insight 4: Top spending category
  if (allExpenses.length > 0) {
    const catSpend: Record<string, number> = {};
    allExpenses.forEach(e => { catSpend[e.category] = (catSpend[e.category] || 0) + e.amount; });
    const topCat = Object.entries(catSpend).sort(([,a], [,b]) => b - a)[0];
    if (topCat) {
      const totalSpend = allExpenses.reduce((s, e) => s + e.amount, 0);
      const pct = Math.round((topCat[1] / totalSpend) * 100);
      insights.push({
        type: 'spending',
        title: 'Top Category',
        description: `${topCat[0]} accounts for ${pct}% of your spending ($${topCat[1].toFixed(0)} in 30 days).`,
        color: '#ff6b81'
      });
    }
  }

  // Insight 5: Journaling consistency
  if (journals.length > 0) {
    const journalDays = new Set(journals.map(j => j.createdAt?.split('T')[0])).size;
    insights.push({
      type: 'journal',
      title: 'Journaling Streak',
      description: `You journaled on ${journalDays} out of the last 30 days. ${journalDays >= 20 ? 'Amazing consistency!' : journalDays >= 10 ? 'Good progress, keep it up!' : 'Try journaling more often for better self-awareness.'}`,
      color: '#ffa502'
    });
  }

  // Fallback insight
  if (insights.length === 0) {
    insights.push({
      type: 'tip',
      title: 'Keep Going!',
      description: 'Log more habits, expenses, and journal entries to unlock personalized insights.',
      color: '#00ff88'
    });
  }

  return c.json(insights);
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

  // Free tier: max 5 active habits
  const user = await db.select({ isPremium: users.isPremium, premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId)).get();
  const premiumActive = user?.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());
  if (!premiumActive) {
    const activeHabits = await db.select({ id: habits.id }).from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
    if (activeHabits.length >= 5) {
      return c.json({ error: 'Free plan allows up to 5 habits. Upgrade to Pro for unlimited habits.' }, 403);
    }
  }

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

app.post('/habits/bulk-delete', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const { ids } = await c.req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ error: 'No ids provided' }, 400);
  for (const id of ids) {
    await db.update(habits).set({ isActive: false }).where(and(eq(habits.id, id), eq(habits.userId, userId)));
  }
  return c.json({ success: true, deleted: ids.length });
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

app.post('/habits/:id/freeze', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const habitId = c.req.param('id');
  const body = await c.req.json();
  const date = body.date || new Date().toISOString().split('T')[0];

  // Check premium status for freeze limits
  const usr = await db.select({ isPremium: users.isPremium, premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, userId)).get();
  const premiumActive = usr?.isPremium && (!usr.premiumUntil || new Date(usr.premiumUntil) > new Date());

  const habit = await db.select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId))).get();
  if (!habit) return c.json({ error: 'Habit not found' }, 404);

  // Reset weekly counter if needed
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const mondayStr = monday.toISOString().split('T')[0];

  let freezesUsed = habit.freezesUsedThisWeek || 0;
  if (habit.lastFreezeReset !== mondayStr) {
    freezesUsed = 0;
  }

  // Free users: 1 freeze/week. Pro users: up to 3/week (configurable)
  const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
  const maxFreezes = premiumActive ? (prefs?.streakFreezePerWeek || 3) : 1;

  if (freezesUsed >= maxFreezes) {
    return c.json({ error: 'No freezes left this week' }, 400);
  }

  // Insert a freeze completion
  await db.insert(habitCompletions).values({ id: createId(), habitId, userId, date, isFreezeDay: true });
  await db.update(habits).set({ freezesUsedThisWeek: freezesUsed + 1, lastFreezeReset: mondayStr }).where(eq(habits.id, habitId));

  return c.json({ success: true, freezesRemaining: maxFreezes - freezesUsed - 1 });
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

app.post('/expenses/bulk-delete', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const { ids } = await c.req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ error: 'No ids provided' }, 400);
  for (const id of ids) {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }
  return c.json({ success: true, deleted: ids.length });
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
  const entry = { id, userId, title: body.title || null, content: body.content, mood: body.mood || 'neutral', tags: body.tags ? JSON.stringify(body.tags) : null, promptId: body.promptId || null };
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

app.post('/journal/bulk-delete', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const { ids } = await c.req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ error: 'No ids provided' }, 400);
  for (const id of ids) {
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
  }
  return c.json({ success: true, deleted: ids.length });
});

// ─── DASHBOARD SUMMARY ───────────────────────────────────────────────────────

app.get('/dashboard', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  const [allHabits, todayCompletions, monthExpenses, todayJournal, recentEntries, user] = await Promise.all([
    db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, today))),
    db.select().from(expenses).where(and(eq(expenses.userId, userId), gte(expenses.date, `${month}-01`), lte(expenses.date, `${month}-31`))),
    db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), gte(journalEntries.createdAt, today))).get(),
    db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt)).limit(3),
    db.select().from(users).where(eq(users.id, userId)).get(),
  ]);

  const totalMonthSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const todaySpend = monthExpenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);

  const premiumActive = user?.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > new Date());

  return c.json({
    habits: { total: allHabits.length, completedToday: todayCompletions.length, list: allHabits, completedIds: todayCompletions.map(c => c.habitId) },
    expenses: { totalMonth: totalMonthSpend, today: todaySpend, recentExpenses: monthExpenses.slice(0, 5) },
    journal: { todayMood: todayJournal?.mood || null, recentEntries },
    onboarded: user?.onboarded ?? true,
    isPremium: premiumActive ?? false,
    premiumUntil: user?.premiumUntil ?? null,
  });
});

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));

export default app;
