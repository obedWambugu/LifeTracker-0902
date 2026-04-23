import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CheckCircle2, Circle, TrendingUp, BookOpen, Plus, ArrowRight, Smile, Meh, Frown, Zap, DollarSign } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';

const moodEmoji: Record<string, { icon: any; color: string; label: string }> = {
  excellent: { icon: '😄', color: '#00ff88', label: 'Excellent' },
  good: { icon: '🙂', color: '#00cc6a', label: 'Good' },
  neutral: { icon: '😐', color: '#ffa502', label: 'Neutral' },
  poor: { icon: '😕', color: '#ff6b81', label: 'Poor' },
  terrible: { icon: '😞', color: '#ff4757', label: 'Terrible' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await api.get('/dashboard');
      setData(d);
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

  useEffect(() => { load(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Fake chart data for demo
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { day: format(d, 'EEE'), date: format(d, 'yyyy-MM-dd') };
  });

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <p className="text-[#555] text-sm mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
          {greeting}, <span className="text-[#00ff88]">{user?.name?.split(' ')[0]}</span>
        </h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8 overflow-hidden">
        {[
          {
            label: 'Habits Today',
            value: `${completedIds.length}/${habits.length}`,
            sub: `${completionRate}% complete`,
            color: '#00ff88',
            icon: <Zap size={16} />,
            delay: 'animate-delay-1',
          },
          {
            label: "Today's Spend",
            value: `$${(data?.expenses?.today || 0).toFixed(2)}`,
            sub: `$${(data?.expenses?.totalMonth || 0).toFixed(0)} this month`,
            color: '#5352ed',
            icon: <DollarSign size={16} />,
            delay: 'animate-delay-2',
          },
          {
            label: "Today's Mood",
            value: moodInfo ? moodInfo.icon : '—',
            sub: moodInfo ? moodInfo.label : 'No entry yet',
            color: moodInfo?.color || '#555',
            icon: <Smile size={16} />,
            delay: 'animate-delay-3',
          },
          {
            label: 'Journal Entries',
            value: data?.journal?.recentEntries?.length || 0,
            sub: 'Recent entries',
            color: '#ffa502',
            icon: <BookOpen size={16} />,
            delay: 'animate-delay-4',
          },
        ].map((stat) => (
          <div key={stat.label} className={`bg-[#111] border border-[#1f1f1f] rounded-xl p-4 md:p-5 animate-fade-in ${stat.delay} min-w-0`}>
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <p className="text-[#555] text-[10px] md:text-xs uppercase tracking-wider truncate pr-1">{stat.label}</p>
              <span style={{ color: stat.color }} className="shrink-0">{stat.icon}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {stat.value}
            </p>
            <p className="text-[#555] text-xs mt-1 truncate">{stat.sub}</p>
          </div>
        ))}
      </div>

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
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className="w-full flex items-center gap-3 p-3 md:p-3 rounded-lg hover:bg-[#1a1a1a] active:bg-[#1f1f1f] transition-all group min-h-[52px]"
                  >
                    {done
                      ? <CheckCircle2 size={20} className="text-[#00ff88] check-pop flex-shrink-0" />
                      : <Circle size={20} className="text-[#333] group-hover:text-[#555] flex-shrink-0" />
                    }
                    <span className={`text-sm flex-1 text-left ${done ? 'text-[#555] line-through' : 'text-white'}`}>
                      {habit.name}
                    </span>
                    <span className="text-[#444] text-xs">{habit.category}</span>
                  </button>
                );
              })}
              {habits.length > 6 && (
                <p className="text-[#555] text-xs text-center pt-1">+{habits.length - 6} more habits</p>
              )}
            </div>
          )}

          {/* Progress bar */}
          {habits.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
              <div className="flex justify-between text-xs text-[#555] mb-2">
                <span>Daily progress</span>
                <span className="text-[#00ff88]">{completionRate}%</span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00ff88] rounded-full transition-all duration-700"
                  style={{ width: `${completionRate}%` }}
                />
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

        {/* Quick Actions */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 animate-fade-in animate-delay-5">
          <h2 className="font-bold text-white text-lg mb-5" style={{ fontFamily: 'Syne, sans-serif' }}>Quick Add</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { href: '/habits?new=1', label: 'New Habit', icon: <Zap size={16} />, color: '#00ff88', bg: 'bg-[#00ff88]/5 hover:bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' },
              { href: '/expenses?new=1', label: 'Log Expense', icon: <DollarSign size={16} />, color: '#5352ed', bg: 'bg-[#5352ed]/5 hover:bg-[#5352ed]/10 border-[#5352ed]/20 text-[#5352ed]' },
              { href: '/journal?new=1', label: 'Write Journal Entry', icon: <BookOpen size={16} />, color: '#ffa502', bg: 'bg-[#ffa502]/5 hover:bg-[#ffa502]/10 border-[#ffa502]/20 text-[#ffa502]' },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <a className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${item.bg}`}>
                  {item.icon}
                  <span className="font-medium text-sm">{item.label}</span>
                  <ArrowRight size={14} className="ml-auto" />
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
