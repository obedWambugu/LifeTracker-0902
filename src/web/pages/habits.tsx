import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, CheckCircle2, Circle, Trash2, Edit2, X, Flame, BarChart2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const CATEGORIES = ['Health', 'Productivity', 'Learning', 'Fitness', 'Mindfulness', 'Other'];
const FREQUENCIES = ['daily', 'weekly'];
const CATEGORY_COLORS: Record<string, string> = {
  Health: '#00ff88',
  Productivity: '#5352ed',
  Learning: '#ffa502',
  Fitness: '#00d2d3',
  Mindfulness: '#ff6b81',
  Other: '#888',
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'Health', frequency: 'daily' });

  const today = format(new Date(), 'yyyy-MM-dd');

  const load = async () => {
    try {
      const [h, c] = await Promise.all([
        api.get('/habits'),
        api.get(`/habits/completions?since=${format(subDays(new Date(), 30), 'yyyy-MM-dd')}`),
      ]);
      setHabits(h);
      setCompletions(c);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const todayCompletedIds = completions.filter((c: any) => c.date === today).map((c: any) => c.habitId);

  const getStreak = (habitId: string) => {
    const dates = completions.filter((c: any) => c.habitId === habitId).map((c: any) => c.date).sort().reverse();
    if (!dates.length) return 0;
    let streak = 0;
    let check = new Date();
    for (const d of dates) {
      const expected = format(check, 'yyyy-MM-dd');
      if (d === expected) { streak++; check = subDays(check, 1); }
      else if (streak === 0 && d === format(subDays(check, 1), 'yyyy-MM-dd')) { check = subDays(check, 1); streak++; check = subDays(check, 1); }
      else break;
    }
    return streak;
  };

  const getCompletionRate = (habitId: string) => {
    const relevant = completions.filter((c: any) => c.habitId === habitId);
    return relevant.length > 0 ? Math.round((relevant.length / 30) * 100) : 0;
  };

  // Last 7 days heat map
  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

  const toggleHabit = async (id: string) => {
    try {
      await api.post(`/habits/${id}/complete`, {});
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/habits/${editing.id}`, form);
        toast.success('Habit updated');
      } else {
        await api.post('/habits', form);
        toast.success('Habit created');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', description: '', category: 'Health', frequency: 'daily' });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteHabit = async (id: string) => {
    if (!confirm('Delete this habit?')) return;
    try {
      await api.delete(`/habits/${id}`);
      toast.success('Habit deleted');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (habit: any) => {
    setEditing(habit);
    setForm({ name: habit.name, description: habit.description || '', category: habit.category, frequency: habit.frequency });
    setShowForm(true);
  };

  const completedToday = todayCompletedIds.length;
  const totalHabits = habits.length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Habits</h1>
          <p className="text-[#555] mt-1">Track your daily routines</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', description: '', category: 'Health', frequency: 'daily' }); }}
          className="flex items-center gap-2 bg-[#00ff88] text-[#080808] px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#00cc6a] transition-colors"
        >
          <Plus size={15} /> New Habit
        </button>
      </div>

      {/* Summary */}
      {totalHabits > 0 && (
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: "Today's Progress", value: `${completedToday}/${totalHabits}`, color: '#00ff88' },
            { label: 'Total Habits', value: totalHabits, color: '#5352ed' },
            { label: 'Overall Rate', value: `${totalHabits > 0 ? Math.round((habits.reduce((a, h) => a + getCompletionRate(h.id), 0) / totalHabits)) : 0}%`, color: '#ffa502' },
          ].map(s => (
            <div key={s.label} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <p className="text-[#555] text-xs mb-2">{s.label}</p>
              <p className="text-2xl font-bold font-mono" style={{ color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#00ff88]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-[#00ff88]" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>No habits yet</h3>
          <p className="text-[#555] mb-6">Start building positive routines</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-[#00ff88] text-[#080808] px-6 py-3 rounded-lg font-semibold hover:bg-[#00cc6a] transition-colors"
          >
            <Plus size={15} /> Create your first habit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const done = todayCompletedIds.includes(habit.id);
            const streak = getStreak(habit.id);
            const rate = getCompletionRate(habit.id);
            const color = CATEGORY_COLORS[habit.category] || '#888';
            return (
              <div key={habit.id} className={`bg-[#111] border rounded-xl p-4 md:p-5 transition-all ${done ? 'border-[#00ff88]/20' : 'border-[#1f1f1f] hover:border-[#2a2a2a]'}`}>
                <div className="flex items-start gap-3 md:gap-4">
                  <button onClick={() => toggleHabit(habit.id)} className="mt-0.5 flex-shrink-0 p-1 -m-1 active:scale-90 transition-transform">
                    {done
                      ? <CheckCircle2 size={26} className="text-[#00ff88]" />
                      : <Circle size={26} className="text-[#333] hover:text-[#555] transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${done ? 'text-[#555] line-through' : 'text-white'}`}>{habit.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color, borderColor: `${color}33`, background: `${color}11` }}>
                        {habit.category}
                      </span>
                    </div>
                    {habit.description && <p className="text-[#555] text-xs mb-3">{habit.description}</p>}

                    {/* Last 7 days */}
                    <div className="flex items-center gap-1 mt-3">
                      {last7.map(d => {
                        const dateStr = format(d, 'yyyy-MM-dd');
                        const completed = completions.some((c: any) => c.habitId === habit.id && c.date === dateStr);
                        return (
                          <div
                            key={dateStr}
                            title={format(d, 'EEE, MMM d')}
                            className="w-6 h-6 rounded-md transition-all"
                            style={{ background: completed ? color : '#1a1a1a', opacity: completed ? 1 : 0.5 }}
                          />
                        );
                      })}
                      <span className="text-[#444] text-xs ml-2">7 days</span>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      {streak > 0 && (
                        <div className="flex items-center gap-1 text-[#ffa502] text-xs">
                          <Flame size={12} />
                          <span>{streak} day streak</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[#555] text-xs">
                        <BarChart2 size={12} />
                        <span>{rate}% (30d)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(habit)} className="text-[#444] hover:text-[#888] transition-colors p-1">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteHabit(habit.id)} className="text-[#444] hover:text-[#ff4757] transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="bg-[#111] border border-[#222] rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {editing ? 'Edit Habit' : 'New Habit'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#555] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveHabit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Habit name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Exercise" required className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#00ff88] transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Description <span className="text-[#444]">(optional)</span></label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#00ff88] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1.5">Frequency</label>
                  <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors">
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-3 rounded-lg border border-[#222] text-[#888] hover:text-white hover:border-[#333] transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-[#00ff88] text-[#080808] font-semibold hover:bg-[#00cc6a] transition-colors text-sm">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
