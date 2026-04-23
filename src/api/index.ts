import { Hono } from 'hono';
import { cors } from "hono/cors";
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, like, desc } from 'drizzle-orm';
import { eachDayOfInterval, subDays } from 'date-fns';
import { users, habits, habitCompletions, expenses, budgets, journalEntries, userPreferences, emailVerificationTokens, dailyCheckins, weeklyReports } from './database/schema';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';

type Env = { DB: D1Database; JWT_SECRET: string; RESEND_API_KEY?: string; EMAIL_FROM?: string };
type Variables = { userId: string };
type UserPlanRow = {
  id: string;
  email: string;
  name: string;
  onboarded: boolean | number | null;
  createdAt: string | null;
  updatedAt: string | null;
  emailVerifiedAt: string | null;
  isPremium: boolean | number | null;
  premiumUntil: string | null;
};
type VerificationDelivery = {
  sent: boolean;
  verificationLink?: string | null;
};

const TRIAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getPremiumActive(user: Pick<UserPlanRow, "isPremium" | "premiumUntil">, now = new Date()) {
  return !!user.isPremium && (!user.premiumUntil || new Date(user.premiumUntil) > now);
}

function getSubscriptionState(user: UserPlanRow, now = new Date()) {
  if (!user.emailVerifiedAt) {
    return {
      isPremium: getPremiumActive(user, now),
      isTrial: false,
      isPostTrial: false,
      trialDaysLeft: TRIAL_DAYS,
      trialEndsAt: null,
    };
  }

  const premiumActive = getPremiumActive(user, now);
  const trialAnchor = user.emailVerifiedAt;
  const trialStartedAt = trialAnchor ? new Date(trialAnchor) : null;
  const trialEndsAt = trialStartedAt ? new Date(trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS) : null;
  const isTrial = !premiumActive && !!trialEndsAt && now < trialEndsAt;
  const isPostTrial = !premiumActive && !!trialEndsAt && now >= trialEndsAt;
  const trialDaysLeft = premiumActive || !trialEndsAt
    ? 0
    : Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));

  return {
    isPremium: premiumActive,
    isTrial,
    isPostTrial,
    trialDaysLeft,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
  };
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function createVerificationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function buildVerificationLink(c: any, token: string) {
  const origin = new URL(c.req.url).origin;
  return new URL(`/auth/verify?token=${encodeURIComponent(token)}`, origin).toString();
}

async function createVerificationTokenRecord(db: any, userId: string) {
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

  const token = createVerificationToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS).toISOString();

  await db.insert(emailVerificationTokens).values({
    id: createId(),
    userId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

async function sendVerificationEmail(c: any, user: { email: string; name: string }, verificationLink: string): Promise<VerificationDelivery> {
  if (!c.env.RESEND_API_KEY || !c.env.EMAIL_FROM) {
    console.info(`[verification] ${user.email}: ${verificationLink}`);
    return { sent: false, verificationLink };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: c.env.EMAIL_FROM,
      to: [user.email],
      subject: 'Verify your Life Tracker email',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>Verify your Life Tracker email</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>Click the button below to verify your email address and activate your 30-day trial.</p>
          <p><a href="${verificationLink}" style="display:inline-block;background:#00ff88;color:#080808;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Verify email</a></p>
          <p>If the button does not work, paste this link into your browser:</p>
          <p>${verificationLink}</p>
        </div>
      `,
      text: `Verify your Life Tracker email: ${verificationLink}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send verification email: ${body}`);
  }

  return { sent: true };
}

function toUserResponse(user: UserPlanRow) {
  const subscription = getSubscriptionState(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    onboarded: !!user.onboarded,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    emailVerifiedAt: user.emailVerifiedAt,
    isEmailVerified: !!user.emailVerifiedAt,
    premiumUntil: user.premiumUntil,
    ...subscription,
  };
}

type DailyCheckInRecord = {
  id: string;
  userId: string;
  checkInDate: string;
  mood: string;
  energy: number | null;
  spendAmount: number | null;
  note: string | null;
  completedHabits: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type WeeklyReportDay = {
  date: string;
  habitCompletions: number;
  habitTarget: number;
  completionRate: number;
  spend: number;
  checkInMood: string | null;
  journalCount: number;
  score: number;
  note: string | null;
};

type WeeklyReportPayload = {
  locked: boolean;
  title: string;
  periodLabel: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  summary: string;
  highlights: string[];
  metrics: {
    habitCompletions: number;
    habitOpportunities: number;
    completionRate: number;
    activeDays: number;
    checkIns: number;
    journalDays: number;
    totalSpend: number;
    averageSpend: number;
    topHabit: { id: string; name: string; completions: number } | null;
    topCategory: { category: string; amount: number } | null;
    bestDay: WeeklyReportDay | null;
  };
  days: WeeklyReportDay[];
};

type YearPixelDay = {
  date: string;
  score: number;
  habitCompletions: number;
  habitTarget: number;
  completionRate: number;
  spend: number;
  checkInMood: string | null;
  journalCount: number;
  note: string | null;
};

type YearCalendarPayload = {
  year: number;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    activeDays: number;
    checkIns: number;
    journalDays: number;
    bestStreak: number;
  };
  days: YearPixelDay[];
};

function formatDateOnly(date: Date) {
  return date.toISOString().split('T')[0];
}

function getWeeklyWindow(now = new Date()) {
  return { start: subDays(now, 6), end: now };
}

function getScore(completionRate: number, checkInMood: string | null, journalCount: number) {
  let score = 0;
  if (completionRate > 0) score += 1;
  if (completionRate >= 50) score += 1;
  if (completionRate >= 80) score += 1;
  if (checkInMood) score += 1;
  if (journalCount > 0) score += 1;
  return Math.min(score, 4);
}

function buildSummarySentence(report: WeeklyReportPayload) {
  const pieces = [
    `You completed ${report.metrics.habitCompletions} habit check-ins out of ${report.metrics.habitOpportunities} opportunities (${report.metrics.completionRate}%).`,
    `You logged ${report.metrics.checkIns} daily check-ins and journaled on ${report.metrics.journalDays} days.`,
    `Total spend came to $${report.metrics.totalSpend.toFixed(2)} across the last 7 days.`,
  ];

  if (report.metrics.topHabit) {
    pieces.push(`Your most consistent habit was "${report.metrics.topHabit.name}" with ${report.metrics.topHabit.completions} completions.`);
  }

  if (report.metrics.topCategory) {
    pieces.push(`Your biggest spend category was ${report.metrics.topCategory.category} at $${report.metrics.topCategory.amount.toFixed(2)}.`);
  }

  pieces.push(
    report.metrics.completionRate >= 70
      ? 'Your routine is strong right now. Keep the good days small and repeatable.'
      : 'Try pairing your check-in with your first habit so the day starts with momentum.'
  );

  return pieces.join(' ');
}

function serializeReport(report: Omit<WeeklyReportPayload, 'locked'>) {
  return JSON.stringify(report);
}

async function buildWeeklyReportPayload(db: any, userId: string, subscription: ReturnType<typeof getSubscriptionState>): Promise<WeeklyReportPayload> {
  if (subscription.isPostTrial) {
    return {
      locked: true,
      title: 'Weekly Life Report',
      periodLabel: 'Locked on Free',
      weekStart: formatDateOnly(getWeeklyWindow().start),
      weekEnd: formatDateOnly(getWeeklyWindow().end),
      generatedAt: new Date().toISOString(),
      summary: 'Unlock a plain-English weekly summary across habits, mood, spending, and journaling.',
      highlights: [
        'See how habits, mood, and money move together.',
        'Track your most consistent habit and biggest spend category.',
        'Keep weekly reminders and deeper patterns unlocked on trial or Pro.',
      ],
      metrics: {
        habitCompletions: 0,
        habitOpportunities: 0,
        completionRate: 0,
        activeDays: 0,
        checkIns: 0,
        journalDays: 0,
        totalSpend: 0,
        averageSpend: 0,
        topHabit: null,
        topCategory: null,
        bestDay: null,
      },
      days: [],
    };
  }

  const { start, end } = getWeeklyWindow();
  const weekStart = formatDateOnly(start);
  const weekEnd = formatDateOnly(end);
  const journalEnd = `${weekEnd}T23:59:59.999Z`;

  const [activeHabits, completions, expensesRows, journalRows, checkInRows] = await Promise.all([
    db.select({
      id: habits.id,
      name: habits.name,
      category: habits.category,
      frequency: habits.frequency,
    }).from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
    db.select({
      habitId: habitCompletions.habitId,
      date: habitCompletions.date,
    }).from(habitCompletions).where(and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, weekStart), lte(habitCompletions.date, weekEnd))),
    db.select({
      amount: expenses.amount,
      category: expenses.category,
      date: expenses.date,
    }).from(expenses).where(and(eq(expenses.userId, userId), gte(expenses.date, weekStart), lte(expenses.date, weekEnd))),
    db.select({
      createdAt: journalEntries.createdAt,
      mood: journalEntries.mood,
      content: journalEntries.content,
      note: journalEntries.title,
    }).from(journalEntries).where(and(eq(journalEntries.userId, userId), gte(journalEntries.createdAt, weekStart), lte(journalEntries.createdAt, journalEnd))),
    db.select({
      checkInDate: dailyCheckins.checkInDate,
      mood: dailyCheckins.mood,
      energy: dailyCheckins.energy,
      spendAmount: dailyCheckins.spendAmount,
      note: dailyCheckins.note,
      completedHabits: dailyCheckins.completedHabits,
    }).from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.checkInDate, weekStart), lte(dailyCheckins.checkInDate, weekEnd))),
  ]);

  const completionByDate: Record<string, number> = {};
  const spendByDate: Record<string, number> = {};
  const journalByDate: Record<string, number> = {};
  const moodByDate: Record<string, string> = {};
  const noteByDate: Record<string, string | null> = {};
  const checkInByDate: Record<string, DailyCheckInRecord> = {};

  completions.forEach(item => {
    completionByDate[item.date] = (completionByDate[item.date] || 0) + 1;
  });
  expensesRows.forEach(item => {
    spendByDate[item.date] = (spendByDate[item.date] || 0) + Number(item.amount || 0);
  });
  journalRows.forEach(item => {
    const date = item.createdAt?.slice(0, 10) || '';
    if (date) {
      journalByDate[date] = (journalByDate[date] || 0) + 1;
      moodByDate[date] = item.mood;
      noteByDate[date] = item.note || item.content?.slice(0, 140) || null;
    }
  });
  checkInRows.forEach(item => {
    checkInByDate[item.checkInDate] = item as DailyCheckInRecord;
    moodByDate[item.checkInDate] = item.mood;
    noteByDate[item.checkInDate] = item.note || null;
  });

  const days = eachDayOfInterval({ start, end }).map(date => {
    const dateKey = formatDateOnly(date);
    const habitCompletionsForDay = completionByDate[dateKey] || 0;
    const habitTarget = activeHabits.length;
    const completionRate = habitTarget > 0 ? Math.round((habitCompletionsForDay / habitTarget) * 100) : 0;
    const checkIn = checkInByDate[dateKey] || null;
    const journalCount = journalByDate[dateKey] || 0;
    const score = getScore(completionRate, moodByDate[dateKey] || null, journalCount);
    return {
      date: dateKey,
      habitCompletions: habitCompletionsForDay,
      habitTarget,
      completionRate,
      spend: spendByDate[dateKey] || 0,
      checkInMood: checkIn?.mood || moodByDate[dateKey] || null,
      journalCount,
      score,
      note: noteByDate[dateKey] || null,
    };
  });

  const habitOpportunities = activeHabits.reduce((sum, habit) => sum + (habit.frequency === 'weekly' ? 1 : 7), 0) || 1;
  const habitCompletionCount = completions.length;
  const completionRateTotal = Math.round((habitCompletionCount / habitOpportunities) * 100);
  const checkInCount = Object.keys(checkInByDate).length;
  const journalDays = Object.keys(journalByDate).length;
  const activeDays = days.filter(day => day.habitCompletions > 0 || day.spend > 0 || day.journalCount > 0 || !!day.checkInMood).length;
  const totalSpend = expensesRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const averageSpend = days.length > 0 ? totalSpend / days.length : 0;

  const habitCounts: Record<string, number> = {};
  completions.forEach(item => {
    habitCounts[item.habitId] = (habitCounts[item.habitId] || 0) + 1;
  });
  const topHabitId = Object.entries(habitCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;
  const topHabit = topHabitId ? (() => {
    const habit = activeHabits.find(entry => entry.id === topHabitId);
    return habit ? { id: habit.id, name: habit.name, completions: habitCounts[topHabitId] } : null;
  })() : null;

  const categorySpend: Record<string, number> = {};
  expensesRows.forEach(item => {
    categorySpend[item.category] = (categorySpend[item.category] || 0) + Number(item.amount || 0);
  });
  const topCategoryEntry = Object.entries(categorySpend).sort(([, a], [, b]) => b - a)[0];
  const topCategory = topCategoryEntry ? { category: topCategoryEntry[0], amount: topCategoryEntry[1] } : null;

  const bestDay = [...days].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
    return b.habitCompletions - a.habitCompletions;
  })[0] || null;

  const report: WeeklyReportPayload = {
    locked: false,
    title: 'Weekly Life Report',
    periodLabel: 'Last 7 days',
    weekStart,
    weekEnd,
    generatedAt: new Date().toISOString(),
    summary: '',
    highlights: [],
    metrics: {
      habitCompletions: habitCompletionCount,
      habitOpportunities,
      completionRate: completionRateTotal,
      activeDays,
      checkIns: checkInCount,
      journalDays,
      totalSpend,
      averageSpend,
      topHabit,
      topCategory,
      bestDay,
    },
    days,
  };

  report.summary = buildSummarySentence(report);
  report.highlights = [
    report.metrics.topHabit
      ? `Most consistent habit: ${report.metrics.topHabit.name} (${report.metrics.topHabit.completions} completions).`
      : 'Add a few habits to see your strongest routine show up here.',
    report.metrics.topCategory
      ? `Top spending category: ${report.metrics.topCategory.category} at $${report.metrics.topCategory.amount.toFixed(2)}.`
      : 'Spend patterns will appear once you log a few expenses.',
    report.metrics.bestDay
      ? `Best day: ${report.metrics.bestDay.date} with a score of ${report.metrics.bestDay.score}/4.`
      : 'Your best day appears here once the week starts filling up.',
  ];

  const payload = serializeReport(report);
  const existing = await db.select().from(weeklyReports).where(and(eq(weeklyReports.userId, userId), eq(weeklyReports.weekStart, weekStart), eq(weeklyReports.weekEnd, weekEnd))).get();
  if (existing) {
    await db.update(weeklyReports).set({ payload }).where(eq(weeklyReports.id, existing.id));
  } else {
    await db.insert(weeklyReports).values({
      id: createId(),
      userId,
      weekStart,
      weekEnd,
      payload,
    });
  }

  return report;
}

async function buildYearCalendarPayload(db: any, userId: string, year = new Date().getFullYear()): Promise<YearCalendarPayload> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const startDate = formatDateOnly(start);
  const endDate = formatDateOnly(end);
  const journalEnd = `${endDate}T23:59:59.999Z`;

  const [completions, expensesRows, journalRows, checkInRows, activeHabits] = await Promise.all([
    db.select({
      habitId: habitCompletions.habitId,
      date: habitCompletions.date,
    }).from(habitCompletions).where(and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, startDate), lte(habitCompletions.date, endDate))),
    db.select({
      amount: expenses.amount,
      date: expenses.date,
    }).from(expenses).where(and(eq(expenses.userId, userId), gte(expenses.date, startDate), lte(expenses.date, endDate))),
    db.select({
      createdAt: journalEntries.createdAt,
      mood: journalEntries.mood,
      content: journalEntries.content,
    }).from(journalEntries).where(and(eq(journalEntries.userId, userId), gte(journalEntries.createdAt, startDate), lte(journalEntries.createdAt, journalEnd))),
    db.select({
      checkInDate: dailyCheckins.checkInDate,
      mood: dailyCheckins.mood,
      note: dailyCheckins.note,
      energy: dailyCheckins.energy,
    }).from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.checkInDate, startDate), lte(dailyCheckins.checkInDate, endDate))),
    db.select({
      id: habits.id,
      frequency: habits.frequency,
    }).from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
  ]);

  const completionByDate: Record<string, number> = {};
  const spendByDate: Record<string, number> = {};
  const journalByDate: Record<string, number> = {};
  const moodByDate: Record<string, string> = {};
  const noteByDate: Record<string, string | null> = {};
  const checkInByDate: Record<string, DailyCheckInRecord> = {};

  completions.forEach(item => {
    completionByDate[item.date] = (completionByDate[item.date] || 0) + 1;
  });
  expensesRows.forEach(item => {
    spendByDate[item.date] = (spendByDate[item.date] || 0) + Number(item.amount || 0);
  });
  journalRows.forEach(item => {
    const date = item.createdAt?.slice(0, 10) || '';
    if (date) {
      journalByDate[date] = (journalByDate[date] || 0) + 1;
      moodByDate[date] = item.mood;
      noteByDate[date] = item.content?.slice(0, 140) || null;
    }
  });
  checkInRows.forEach(item => {
    checkInByDate[item.checkInDate] = item as DailyCheckInRecord;
    moodByDate[item.checkInDate] = item.mood;
    noteByDate[item.checkInDate] = item.note || null;
  });

  const days = eachDayOfInterval({ start, end }).map(date => {
    const dateKey = formatDateOnly(date);
    const habitCompletionsForDay = completionByDate[dateKey] || 0;
    const habitTarget = activeHabits.length;
    const completionRate = habitTarget > 0 ? Math.round((habitCompletionsForDay / habitTarget) * 100) : 0;
    const score = getScore(completionRate, moodByDate[dateKey] || null, journalByDate[dateKey] || 0);
    return {
      date: dateKey,
      score,
      habitCompletions: habitCompletionsForDay,
      habitTarget,
      completionRate,
      spend: spendByDate[dateKey] || 0,
      checkInMood: moodByDate[dateKey] || null,
      journalCount: journalByDate[dateKey] || 0,
      note: noteByDate[dateKey] || null,
    };
  });

  let bestStreak = 0;
  let currentStreak = 0;
  for (const day of days) {
    if (day.score >= 2) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    year,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    summary: {
      activeDays: days.filter(day => day.score > 0).length,
      checkIns: Object.keys(checkInByDate).length,
      journalDays: Object.keys(journalByDate).length,
      bestStreak,
    },
    days,
  };
}

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
    if (existing?.emailVerifiedAt) return c.json({ error: 'Email already registered', code: 'EMAIL_ALREADY_REGISTERED' }, 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const id = existing?.id || createId();

    if (existing) {
      await db.update(users).set({
        name,
        passwordHash,
        emailVerifiedAt: null,
        updatedAt: now,
      }).where(eq(users.id, existing.id));
    } else {
      await db.insert(users).values({
        id,
        email,
        name,
        passwordHash,
        emailVerifiedAt: null,
      });
    }

    const verification = await createVerificationTokenRecord(db, id);
    const verificationLink = buildVerificationLink(c, verification.token);
    let delivery: VerificationDelivery = { sent: false, verificationLink };
    try {
      delivery = await sendVerificationEmail(c, { email, name }, verificationLink);
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }

    return c.json({
      verificationRequired: true,
      email,
      verificationEmailSent: delivery.sent,
      message: delivery.sent
        ? 'We sent a verification email to your inbox.'
        : 'We created your account, but local email delivery is not configured. Use the verification link below.',
      verificationLink: delivery.sent ? null : delivery.verificationLink,
      user: toUserResponse({
        id,
        email,
        name,
        onboarded: false,
        createdAt: now,
        updatedAt: now,
        emailVerifiedAt: null,
        isPremium: false,
        premiumUntil: null,
      }),
    });
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
    if (!user.emailVerifiedAt) {
      return c.json({
        error: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        details: { email: user.email },
      }, 403);
    }
    const secret = c.env.JWT_SECRET || 'life-tracker-secret-2024';
    const token = await sign({ userId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);
    return c.json({ token, user: toUserResponse(user as UserPlanRow) });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/auth/profile', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  })
    .from(users).where(eq(users.id, c.get('userId'))).get();
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json(toUserResponse(user as UserPlanRow));
});

app.post('/auth/resend-verification', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'Email required' }, 400);

    const db = drizzle(c.env.DB);
    const user = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      onboarded: users.onboarded,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      emailVerifiedAt: users.emailVerifiedAt,
      isPremium: users.isPremium,
      premiumUntil: users.premiumUntil,
    }).from(users).where(eq(users.email, email)).get();

    if (!user) {
      return c.json({
        success: true,
        message: 'If the email exists, we sent a verification link.',
      });
    }

    if (user.emailVerifiedAt) {
      return c.json({
        success: true,
        message: 'That email is already verified.',
      });
    }

    const verification = await createVerificationTokenRecord(db, user.id);
    const verificationLink = buildVerificationLink(c, verification.token);
    let delivery: VerificationDelivery = { sent: false, verificationLink };
    try {
      delivery = await sendVerificationEmail(c, { email: user.email, name: user.name }, verificationLink);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
    }

    return c.json({
      success: true,
      message: delivery.sent
        ? 'Verification email sent.'
        : 'We could not send the email automatically. Use the verification link below.',
      verificationEmailSent: delivery.sent,
      verificationLink: delivery.sent ? null : delivery.verificationLink,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/auth/verify-email', async (c) => {
  try {
    const { token } = await c.req.json();
    if (!token) return c.json({ error: 'Verification token required' }, 400);

    const db = drizzle(c.env.DB);
    const tokenHash = await sha256Hex(token);
    const record = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.tokenHash, tokenHash)).get();
    if (!record) {
      return c.json({ error: 'Invalid or expired verification link', code: 'INVALID_VERIFICATION_TOKEN' }, 400);
    }

    const now = new Date();
    if (record.consumedAt || new Date(record.expiresAt) < now) {
      return c.json({ error: 'Invalid or expired verification link', code: 'INVALID_VERIFICATION_TOKEN' }, 400);
    }

    const user = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      onboarded: users.onboarded,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      emailVerifiedAt: users.emailVerifiedAt,
      isPremium: users.isPremium,
      premiumUntil: users.premiumUntil,
    }).from(users).where(eq(users.id, record.userId)).get();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const verifiedAt = user.emailVerifiedAt || now.toISOString();
    await db.update(users).set({
      emailVerifiedAt: verifiedAt,
      updatedAt: verifiedAt,
    }).where(eq(users.id, user.id));

    await db.update(emailVerificationTokens).set({
      consumedAt: now.toISOString(),
    }).where(eq(emailVerificationTokens.id, record.id));
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, user.id));

    const secret = c.env.JWT_SECRET || 'life-tracker-secret-2024';
    const tokenJwt = await sign({ userId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);
    return c.json({
      token: tokenJwt,
      user: toUserResponse({
        ...user,
        emailVerifiedAt: verifiedAt,
      } as UserPlanRow),
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
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
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json(toUserResponse(user as UserPlanRow));
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

// ─── DAILY CHECK-INS ─────────────────────────────────────────────────────────

app.get('/daily-checkins', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const since = c.req.query('since') || formatDateOnly(subDays(new Date(), 30));
  const until = c.req.query('until') || formatDateOnly(new Date());
  const rows = await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.checkInDate, since), lte(dailyCheckins.checkInDate, until))).orderBy(desc(dailyCheckins.checkInDate));
  return c.json(rows);
});

app.post('/daily-checkins', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const checkInDate = body.checkInDate || formatDateOnly(new Date());
  const existing = await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.checkInDate, checkInDate))).get();
  const record = {
    mood: body.mood || 'neutral',
    energy: body.energy != null ? Number(body.energy) : 3,
    spendAmount: body.spendAmount != null ? Number(body.spendAmount) : 0,
    note: body.note?.trim() || null,
    completedHabits: body.completedHabits != null ? Number(body.completedHabits) : 0,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    await db.update(dailyCheckins).set(record).where(eq(dailyCheckins.id, existing.id));
    const updated = await db.select().from(dailyCheckins).where(eq(dailyCheckins.id, existing.id)).get();
    return c.json({ success: true, created: false, checkIn: updated });
  }

  const id = createId();
  await db.insert(dailyCheckins).values({
    id,
    userId,
    checkInDate,
    ...record,
  });
  const created = await db.select().from(dailyCheckins).where(eq(dailyCheckins.id, id)).get();
  return c.json({ success: true, created: true, checkIn: created });
});

// ─── WEEKLY LIFE REPORT ─────────────────────────────────────────────────────

app.get('/weekly-report', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');

  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();

  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  const report = await buildWeeklyReportPayload(db, userId, subscription);
  return c.json(report);
});

// ─── YEAR IN PIXELS ─────────────────────────────────────────────────────────

app.get('/calendar/year', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const year = Number(c.req.query('year') || new Date().getFullYear());
  const payload = await buildYearCalendarPayload(db, userId, Number.isFinite(year) ? year : new Date().getFullYear());
  return c.json(payload);
});

// ─── INSIGHTS / CORRELATIONS ────────────────────────────────────────────────

app.get('/insights', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');

  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json([{ type: 'upgrade', title: 'Unlock Insights', description: 'Your free plan keeps ads, but Pro removes them and unlocks correlations, prompts, and journal tools.', color: '#00ff88' }]);
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

  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    const activeHabits = await db.select({ id: habits.id }).from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
    if (activeHabits.length >= 3) {
      return c.json({ error: 'Free plan allows up to 3 habits after the trial. Upgrade to Pro for unlimited habits.' }, 403);
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

  const usr = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!usr) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(usr as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json({ error: 'Streak freezes are available during the trial or on Pro.' }, 403);
  }

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

  const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
  const maxFreezes = prefs?.streakFreezePerWeek || 3;

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
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json({ error: 'Journal access is available during the trial or on Pro.' }, 403);
  }

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
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json({ error: 'Journal entries are available during the trial or on Pro.' }, 403);
  }

  const id = createId();
  const entry = { id, userId, title: body.title || null, content: body.content, mood: body.mood || 'neutral', tags: body.tags ? JSON.stringify(body.tags) : null, promptId: body.promptId || null };
  await db.insert(journalEntries).values(entry);
  return c.json(entry, 201);
});

app.put('/journal/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const body = await c.req.json();
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json({ error: 'Journal edits are available during the trial or on Pro.' }, 403);
  }

  await db.update(journalEntries).set({ title: body.title, content: body.content, mood: body.mood, tags: body.tags ? JSON.stringify(body.tags) : null, updatedAt: new Date().toISOString() }).where(and(eq(journalEntries.id, c.req.param('id')), eq(journalEntries.userId, userId)));
  return c.json({ success: true });
});

app.delete('/journal/:id', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json({ error: 'Journal deletions are available during the trial or on Pro.' }, 403);
  }

  await db.delete(journalEntries).where(and(eq(journalEntries.id, c.req.param('id')), eq(journalEntries.userId, userId)));
  return c.json({ success: true });
});

app.post('/journal/bulk-delete', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const { ids } = await c.req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ error: 'No ids provided' }, 400);
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  if (subscription.isPostTrial) {
    return c.json({ error: 'Journal bulk actions are available during the trial or on Pro.' }, 403);
  }

  for (const id of ids) {
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
  }
  return c.json({ success: true, deleted: ids.length });
});

// ─── DASHBOARD SUMMARY ───────────────────────────────────────────────────────

app.get('/dashboard', authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get('userId');
  const user = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    onboarded: users.onboarded,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    emailVerifiedAt: users.emailVerifiedAt,
    isPremium: users.isPremium,
    premiumUntil: users.premiumUntil,
  }).from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: 'Not found' }, 404);

  const subscription = getSubscriptionState(user as UserPlanRow);
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  const [allHabits, todayCompletions, monthExpenses, todayCheckIn] = await Promise.all([
    db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, today))),
    db.select().from(expenses).where(and(eq(expenses.userId, userId), gte(expenses.date, `${month}-01`), lte(expenses.date, `${month}-31`))),
    db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.checkInDate, today))).get(),
  ]);

  let todayJournal: any = null;
  let recentEntries: any[] = [];
  if (!subscription.isPostTrial) {
    [todayJournal, recentEntries] = await Promise.all([
      db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), gte(journalEntries.createdAt, today))).get(),
      db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt)).limit(3),
    ]);
  }

  const totalMonthSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const todaySpend = monthExpenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);

  return c.json({
    habits: { total: allHabits.length, completedToday: todayCompletions.length, list: allHabits, completedIds: todayCompletions.map(c => c.habitId) },
    expenses: { totalMonth: totalMonthSpend, today: todaySpend, recentExpenses: monthExpenses.slice(0, 5) },
    journal: { todayMood: todayJournal?.mood || null, recentEntries },
    dailyCheckIn: todayCheckIn || null,
    onboarded: !!user.onboarded,
    isPremium: subscription.isPremium,
    isTrial: subscription.isTrial,
    isPostTrial: subscription.isPostTrial,
    trialDaysLeft: subscription.trialDaysLeft,
    premiumUntil: user.premiumUntil ?? null,
  });
});

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));

export default app;
