import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CheckCircle2, Circle, BookOpen, Plus, ArrowRight, Smile, Zap, DollarSign, Lightbulb, Sparkles, ChevronRight, RefreshCw, Crown } from 'lucide-react';
import { Link, useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDailyPrompt, getRandomPrompt, PROMPT_CATEGORIES, type Prompt } from '../lib/prompts';
import { UpgradeModal } from '../components/UpgradeModal';
import { AdBanner } from '../components/AdBanner';
import DailyCheckInModal from '../components/DailyCheckInModal';
import WeeklyReportCard from '../components/WeeklyReportCard';
import YearInPixels from '../components/YearInPixels';

const moodEmoji: Record<string, { icon: string; color: string; label: string }> = {
  excellent: { icon: '😄', color: '#00ff88', label: 'Excellent' },
  good: { icon: '🙂', color: '#00cc6a', label: 'Good' },
  neutral: { icon: '😐', color: '#ffa502', label: 'Neutral' },
  poor: { icon: '😕', color: '#ff6b81', label: 'Poor' },
  terrible: { icon: '😞', color: '#ff4757', label: 'Terrible' },
};

function OnboardingWizard({ onComplete }: { onComplete: () => void; onSkip?: () => void }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      title: 'Welcome to Life Tracker!',
      desc: 'Your personal hub for habits, expenses, and journaling — all in one place.',
      icon: <Sparkles size={32} className="text-[#00ff88]" />,
    },
    {
      title: 'Track Your Habits',
      desc: 'Build consistency with daily habit tracking, streaks, and streak freezes for those off days.',
      icon: <Zap size={32} className="text-[#00ff88]" />,
    },
    {
      title: 'Manage Your Money',
      desc: 'Log expenses, set budgets, and see where your money goes with visual analytics.',
      icon: <DollarSign size={32} className="text-[#5352ed]" />,
    },
    {
      title: 'Reflect & Grow',
      desc: 'Journal with curated prompts, track your mood, and discover insights about yourself.',
      icon: <BookOpen size={32} className="text-[#ffa502]" />,
    },
  ];

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/skip', {});
      onComplete();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl max-w-md w-full p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-6">{steps[step].icon}</div>
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            {steps[step].title}
          </h2>
          <p className="text-[#888] text-sm leading-relaxed">{steps[step].desc}</p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[#00ff88] w-6' : 'bg-[#333]'}`} />
          ))}
        </div>

        {step < steps.length - 1 ? (
          <div className="flex gap-3">
            <button onClick={handleFinish} disabled={loading} className="flex-1 border border-[#222] text-[#888] py-3 rounded-xl text-sm hover:bg-[#1a1a1a] transition-colors">
              Skip
            </button>
            <button onClick={() => setStep(step + 1)} className="flex-1 bg-[#00ff88] text-[#080808] py-3 rounded-xl text-sm font-semibold hover:bg-[#00cc6a] transition-colors">
              Next
            </button>
          </div>
        ) : (
          <button onClick={handleFinish} disabled={loading} className="w-full bg-[#00ff88] text-[#080808] py-3 rounded-xl text-sm font-semibold hover:bg-[#00cc6a] transition-colors disabled:opacity-50">
            {loading ? 'Setting up...' : "Let's get started"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isPremium, isTrial, isPostTrial, trialDaysLeft } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [calendar, setCalendar] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState<Prompt>(getDailyPrompt());
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const hasProAccess = isPremium || isTrial;
  const showAds = !isPremium;

  const load = async () => {
    try {
      const [d, report, yearCalendar] = await Promise.all([
        api.get('/dashboard'),
        api.get('/weekly-report').catch(() => null),
        api.get('/calendar/year').catch(() => null),
      ]);
      setData(d);
      setWeeklyReport(report);
      setCalendar(yearCalendar);
      if (d.onboarded === false) setShowOnboarding(true);
      if (hasProAccess) {
        try {
          const ins = await api.get('/insights');
          setInsights(ins);
        } catch {
          setInsights([]);
        }
      } else {
        setInsights([]);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (id: string) => {
    try {
      await api.post(`/habits/${id}/complete`, {});
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => { load(); }, [hasProAccess]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('checkin') === '1') {
      setShowCheckIn(true);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [search]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const habits = data?.habits?.list || [];
  const completedIds = data?.habits?.completedIds || [];
  const completionRate = habits.length > 0 ? Math.round((completedIds.length / habits.length) * 100) : 0;
  const mood = data?.journal?.todayMood;
  const moodInfo = mood ? moodEmoji[mood] : null;
  const planLabel = isPremium ? 'Pro plan active' : isTrial ? `Trial active · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : 'Free plan active · ads shown';
  const quickActions = hasProAccess
    ? [
        { action: 'checkin', label: data?.dailyCheckIn ? 'Update Check-in' : 'Daily Check-in', icon: <Sparkles size={16} />, bg: 'bg-[#00ff88]/5 hover:bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' },
        { href: '/habits?new=1', label: 'New Habit', icon: <Zap size={16} />, bg: 'bg-[#00ff88]/5 hover:bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' },
        { href: '/expenses?new=1', label: 'Log Expense', icon: <DollarSign size={16} />, bg: 'bg-[#5352ed]/5 hover:bg-[#5352ed]/10 border-[#5352ed]/20 text-[#5352ed]' },
        { href: '/journal?new=1', label: 'Write Journal Entry', icon: <BookOpen size={16} />, bg: 'bg-[#ffa502]/5 hover:bg-[#ffa502]/10 border-[#ffa502]/20 text-[#ffa502]' },
      ]
    : [
        { action: 'checkin', label: data?.dailyCheckIn ? 'Update Check-in' : 'Daily Check-in', icon: <Sparkles size={16} />, bg: 'bg-[#00ff88]/5 hover:bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' },
        { href: '/habits?new=1', label: 'New Habit', icon: <Zap size={16} />, bg: 'bg-[#00ff88]/5 hover:bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' },
        { href: '/expenses?new=1', label: 'Log Expense', icon: <DollarSign size={16} />, bg: 'bg-[#5352ed]/5 hover:bg-[#5352ed]/10 border-[#5352ed]/20 text-[#5352ed]' },
        { href: '#upgrade', label: 'Unlock Journal', icon: <Crown size={16} />, bg: 'bg-[#ffa502]/5 hover:bg-[#ffa502]/10 border-[#ffa502]/20 text-[#ffa502]' },
      ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => { setShowOnboarding(false); load(); }}
        />
      )}

      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <p className="text-[#555] text-sm mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
          {greeting}, <span className="text-[#00ff88]">{user?.name?.split(' ')[0]}</span>
        </h1>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            isPremium
              ? 'border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88]'
              : isTrial
                ? 'border-[#5352ed]/30 bg-[#5352ed]/10 text-[#a9b1ff]'
                : 'border-[#ffa502]/30 bg-[#ffa502]/10 text-[#ffa502]'
          }`}
        >
          {planLabel}
        </span>
        <p className="text-xs text-[#666]">
          {isPremium ? 'Ads are hidden on Pro.' : 'Ads support the free and trial experience.'}
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#1f1f1f] bg-gradient-to-br from-[#00ff88]/5 via-[#111] to-[#5352ed]/5 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff88]">
              <Sparkles size={12} />
              One-tap daily check-in
            </div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Log today in 10 seconds
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#888]">
              Capture mood, energy, spending, and a quick note before the day gets away from you.
            </p>
            {data?.dailyCheckIn && (
              <p className="mt-3 text-xs font-medium text-[#00ff88]">
                You already checked in today. Open the quick check-in again to update it.
              </p>
            )}
          </div>
          <button
            onClick={() => setShowCheckIn(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-5 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a]"
          >
            <Sparkles size={14} />
            {data?.dailyCheckIn ? 'Update check-in' : 'Quick check-in'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8 overflow-hidden">
        {[
          { label: 'Habits Today', value: `${completedIds.length}/${habits.length}`, sub: `${completionRate}% complete`, color: '#00ff88', icon: <Zap size={16} />, delay: 'animate-delay-1' },
          { label: "Today's Spend", value: `$${(data?.expenses?.today || 0).toFixed(2)}`, sub: `$${(data?.expenses?.totalMonth || 0).toFixed(0)} this month`, color: '#5352ed', icon: <DollarSign size={16} />, delay: 'animate-delay-2' },
          { label: "Today's Mood", value: hasProAccess ? (moodInfo ? moodInfo.icon : '—') : 'Locked', sub: hasProAccess ? (moodInfo ? moodInfo.label : 'No entry yet') : 'Trial / Pro feature', color: hasProAccess ? (moodInfo?.color || '#555') : '#777', icon: <Smile size={16} />, delay: 'animate-delay-3' },
          { label: 'Journal Entries', value: hasProAccess ? (data?.journal?.recentEntries?.length || 0) : 'Locked', sub: hasProAccess ? 'Recent entries' : 'Trial / Pro feature', color: '#ffa502', icon: <BookOpen size={16} />, delay: 'animate-delay-4' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-[#111] border border-[#1f1f1f] rounded-xl p-4 md:p-5 animate-fade-in ${stat.delay} min-w-0`}>
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <p className="text-[#555] text-[10px] md:text-xs uppercase tracking-wider truncate pr-1">{stat.label}</p>
              <span style={{ color: stat.color }} className="shrink-0">{stat.icon}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</p>
            <p className="text-[#555] text-xs mt-1 truncate">{stat.sub}</p>
          </div>
        ))}
      </div>

      {showAds && <AdBanner slot="dashboard-top" className="mb-6 md:mb-8" />}

      <div className="mb-6 md:mb-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <WeeklyReportCard
          report={weeklyReport}
          loading={loading && !weeklyReport}
          onRefresh={load}
          onUpgrade={() => setShowUpgrade(true)}
        />
        <YearInPixels
          calendar={calendar}
          loading={loading && !calendar}
        />
      </div>

      {/* Insights Cards */}
      {(insights.length > 0 || !hasProAccess) && (
        <div className="mb-6 md:mb-8 animate-fade-in animate-delay-2">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-[#ffa502]" />
            <h2 className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Insights</h2>
            {!hasProAccess && <span className="rounded-full border border-[#ffa502]/20 bg-[#ffa502]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffa502]">Locked</span>}
          </div>
          {!hasProAccess ? (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00ff88]/10 rounded-xl flex items-center justify-center">
                  <Crown size={18} className="text-[#00ff88]" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Unlock correlation insights</p>
                  <p className="text-[#555] text-xs">Trial keeps them on, Free locks them and keeps ads.</p>
                </div>
              </div>
              <button onClick={() => setShowUpgrade(true)} className="bg-[#00ff88] text-[#080808] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#00cc6a] transition-colors flex-shrink-0">
                Upgrade
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              {insights.map((insight, i) => (
                <div key={i} className="min-w-[260px] max-w-[300px] bg-[#111] border border-[#1f1f1f] rounded-xl p-4 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: insight.color }} />
                    <p className="text-white text-sm font-semibold">{insight.title}</p>
                  </div>
                  <p className="text-[#888] text-xs leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt of the Day */}
      {hasProAccess ? (
        <div className="mb-6 md:mb-8 bg-gradient-to-r from-[#ffa502]/5 to-[#ff6b81]/5 border border-[#ffa502]/20 rounded-xl p-5 animate-fade-in animate-delay-3 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#ffa502]" />
              <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Prompt of the Day</h3>
            </div>
            <button onClick={() => setDailyPrompt(getRandomPrompt())} className="text-[#555] hover:text-[#ffa502] transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <p className="text-[#ccc] text-sm leading-relaxed mb-3">"{dailyPrompt.text}"</p>
          <div className="flex items-center justify-between">
            <span className="text-[#ffa502]/60 text-xs capitalize">{dailyPrompt.category}</span>
            <button onClick={() => setLocation('/journal?new=1&prompt=' + dailyPrompt.id)} className="text-[#ffa502] text-xs flex items-center gap-1 hover:underline">
              Write about this <ChevronRight size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 md:mb-8 rounded-xl border border-[#1f1f1f] bg-[#111] p-5 animate-fade-in animate-delay-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#ffa502]" />
            <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Prompt of the Day</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#888]">
            Prompts and journaling stay unlocked during the 30-day trial and on Pro.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ffa502] hover:underline"
          >
            Upgrade to write <ChevronRight size={12} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Habits */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 animate-fade-in animate-delay-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Today's Habits</h2>
            <Link href="/habits">
              <a className="text-[#00ff88] text-xs flex items-center gap-1 hover:underline">View all <ArrowRight size={12} /></a>
            </Link>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#555] mb-3">No habits yet</p>
              <Link href="/habits">
                <a className="inline-flex items-center gap-2 bg-[#00ff88]/10 text-[#00ff88] px-4 py-2 rounded-lg text-sm hover:bg-[#00ff88]/20 transition-colors">
                  <Plus size={14} /> Add your first habit
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {habits.slice(0, 6).map((habit: any) => {
                const done = completedIds.includes(habit.id);
                return (
                  <button key={habit.id} onClick={() => toggleHabit(habit.id)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] active:bg-[#1f1f1f] transition-all group min-h-[52px]">
                    {done ? <CheckCircle2 size={20} className="text-[#00ff88] check-pop flex-shrink-0" /> : <Circle size={20} className="text-[#333] group-hover:text-[#555] flex-shrink-0" />}
                    <span className={`text-sm flex-1 text-left ${done ? 'text-[#555] line-through' : 'text-white'}`}>{habit.name}</span>
                    <span className="text-[#444] text-xs">{habit.category}</span>
                  </button>
                );
              })}
              {habits.length > 6 && <p className="text-[#555] text-xs text-center pt-1">+{habits.length - 6} more habits</p>}
            </div>
          )}

          {habits.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
              <div className="flex justify-between text-xs text-[#555] mb-2">
                <span>Daily progress</span>
                <span className="text-[#00ff88]">{completionRate}%</span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full bg-[#00ff88] rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 animate-fade-in animate-delay-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Recent Expenses</h2>
            <Link href="/expenses">
              <a className="text-[#00ff88] text-xs flex items-center gap-1 hover:underline">View all <ArrowRight size={12} /></a>
            </Link>
          </div>

          {(data?.expenses?.recentExpenses?.length || 0) === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#555] mb-3">No expenses logged</p>
              <Link href="/expenses">
                <a className="inline-flex items-center gap-2 bg-[#5352ed]/10 text-[#5352ed] px-4 py-2 rounded-lg text-sm hover:bg-[#5352ed]/20 transition-colors">
                  <Plus size={14} /> Log an expense
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.expenses.recentExpenses.map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-[#151515]">
                  <div>
                    <p className="text-white text-sm">{exp.description || exp.category}</p>
                    <p className="text-[#555] text-xs mt-0.5">{exp.category} · {exp.date}</p>
                  </div>
                  <p className="text-white font-mono font-medium text-sm">${exp.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Journal Entries */}
      {hasProAccess ? (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 animate-fade-in animate-delay-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Recent Journal</h2>
            <Link href="/journal">
              <a className="text-[#00ff88] text-xs flex items-center gap-1 hover:underline">View all <ArrowRight size={12} /></a>
            </Link>
          </div>

          {(data?.journal?.recentEntries?.length || 0) === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#555] mb-3">No journal entries yet</p>
              <Link href="/journal">
                <a className="inline-flex items-center gap-2 bg-[#ffa502]/10 text-[#ffa502] px-4 py-2 rounded-lg text-sm hover:bg-[#ffa502]/20 transition-colors">
                  <Plus size={14} /> Write first entry
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.journal.recentEntries.map((entry: any) => {
                const m = moodEmoji[entry.mood];
                return (
                  <div key={entry.id} className="p-3 rounded-lg bg-[#151515]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{m?.icon}</span>
                      <p className="text-white text-sm font-medium">{entry.title || 'Untitled'}</p>
                    </div>
                    <p className="text-[#555] text-xs line-clamp-2">{entry.content}</p>
                    <p className="text-[#444] text-xs mt-2">{format(new Date(entry.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 animate-fade-in animate-delay-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Journal</h2>
            <button onClick={() => setShowUpgrade(true)} className="text-[#ffa502] text-xs flex items-center gap-1 hover:underline">
              Upgrade <ArrowRight size={12} />
            </button>
          </div>
          <div className="rounded-xl border border-dashed border-[#222] bg-[#0d0d0d] p-5">
            <p className="text-sm text-[#ddd]">Journaling and prompts stay unlocked for the 30-day trial and Pro.</p>
            <p className="mt-2 text-xs leading-relaxed text-[#666]">The post-trial Free plan keeps ads, habits, and expenses only.</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 animate-fade-in animate-delay-5">
        <h2 className="font-bold text-white text-lg mb-5" style={{ fontFamily: 'Syne, sans-serif' }}>Quick Add</h2>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map(item => item.action === 'checkin' ? (
            <button
              key={item.label}
              onClick={() => setShowCheckIn(true)}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${item.bg}`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              <ArrowRight size={14} className="ml-auto" />
            </button>
          ) : item.href === '#upgrade' ? (
            <button key={item.label} onClick={() => setShowUpgrade(true)} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${item.bg}`}>
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              <ArrowRight size={14} className="ml-auto" />
            </button>
          ) : (
            <Link key={item.href} href={item.href}>
              <a className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${item.bg}`}>
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
                <ArrowRight size={14} className="ml-auto" />
              </a>
            </Link>
          ))}
        </div>
      </div>
      </div>

      {showCheckIn && (
        <DailyCheckInModal
          open={showCheckIn}
          onClose={() => setShowCheckIn(false)}
          onSaved={load}
          completedHabits={completedIds.length}
          totalHabits={habits.length}
          initialCheckIn={data?.dailyCheckIn}
        />
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
