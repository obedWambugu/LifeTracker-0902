import { useEffect, useState } from 'react';
import { X, Sparkles, Flame, DollarSign, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

type DailyCheckInModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  completedHabits: number;
  totalHabits: number;
  initialCheckIn?: {
    mood?: string | null;
    energy?: number | null;
    spendAmount?: number | null;
    note?: string | null;
  } | null;
};

const MOODS = [
  { value: 'excellent', label: 'Excellent', emoji: '\u{1F604}', color: '#00ff88' },
  { value: 'good', label: 'Good', emoji: '\u{1F642}', color: '#00cc6a' },
  { value: 'neutral', label: 'Neutral', emoji: '\u{1F610}', color: '#ffa502' },
  { value: 'poor', label: 'Poor', emoji: '\u{1F615}', color: '#ff6b81' },
  { value: 'terrible', label: 'Terrible', emoji: '\u{1F61E}', color: '#ff4757' },
] as const;

const shellClass =
  'relative w-full max-w-2xl overflow-hidden rounded-t-[28px] border border-[#232323] bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.55)] sm:rounded-3xl';

export default function DailyCheckInModal({
  open,
  onClose,
  onSaved,
  completedHabits,
  totalHabits,
  initialCheckIn,
}: DailyCheckInModalProps) {
  const [mood, setMood] = useState('neutral');
  const [energy, setEnergy] = useState(3);
  const [spendAmount, setSpendAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMood(initialCheckIn?.mood || 'neutral');
    setEnergy(initialCheckIn?.energy ?? 3);
    setSpendAmount(
      initialCheckIn?.spendAmount != null && Number.isFinite(Number(initialCheckIn.spendAmount))
        ? String(initialCheckIn.spendAmount)
        : ''
    );
    setNote(initialCheckIn?.note || '');
  }, [open, initialCheckIn]);

  if (!open) return null;

  const progress = Math.round((completedHabits / Math.max(totalHabits, 1)) * 100);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/daily-checkins', {
        mood,
        energy,
        spendAmount: spendAmount ? Number(spendAmount) : 0,
        note: note.trim() || null,
        completedHabits,
      });
      toast.success('Daily check-in saved');
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 px-4 py-4 backdrop-blur-xl sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div className={shellClass} onClick={e => e.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-20 h-56 w-56 rounded-full bg-[#00ff88]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#5352ed]/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/30 to-transparent" />
        </div>

        <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 border-b border-[#1f1f1f]/80 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ff88]/20 to-[#5352ed]/20 text-[#00ff88] shadow-[0_0_0_1px_rgba(0,255,136,0.12)]">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00ff88]">
                  One-tap check-in
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  How is today going?
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#888]">
                  Capture mood, energy, spending, and a note in less than 10 seconds.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#232323] bg-[#0f0f0f] text-[#aaa] transition-colors hover:border-[#333] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <div className="mb-5 rounded-3xl border border-[#1c1c1c] bg-gradient-to-br from-[#00ff88]/8 via-[#0d0d0d] to-[#5352ed]/8 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Today&apos;s progress</p>
                  <p className="mt-1 text-xs text-[#666]">
                    {completedHabits}/{Math.max(totalHabits, 1)} habits completed
                  </p>
                </div>
                <div className="inline-flex items-center rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
                  {completedHabits > 0 ? 'You are moving' : 'Start with one small win'}
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#161616]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00ff88] to-[#5352ed] transition-all duration-300"
                  style={{ width: `${Math.max(18, progress)}%` }}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <Smile size={14} className="text-[#ffa502]" />
                  Mood
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {MOODS.map(option => {
                    const active = mood === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMood(option.value)}
                        className={`group rounded-2xl border p-3 text-left transition-all duration-200 ${
                          active
                            ? 'border-[#00ff88]/40 bg-[#00ff88]/10 shadow-[0_0_0_1px_rgba(0,255,136,0.08)]'
                            : 'border-[#222] bg-[#0b0b0b] hover:-translate-y-0.5 hover:border-[#333] hover:bg-[#131313]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${
                              active ? 'bg-[#00ff88]/10' : 'bg-[#111]'
                            }`}
                          >
                            {option.emoji}
                          </div>
                          {active && (
                            <span className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00ff88]">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="mt-3 text-sm font-semibold text-white">{option.label}</div>
                        <div className="mt-2 h-1.5 rounded-full bg-[#1d1d1d]" style={{ backgroundColor: active ? option.color : '#1d1d1d' }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <Flame size={14} className="text-[#ff6b81]" />
                  Energy
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEnergy(level)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                        energy === level
                          ? 'border-[#ffa502]/30 bg-[#ffa502]/10 text-[#ffa502]'
                          : 'border-[#222] bg-[#0b0b0b] text-[#777] hover:-translate-y-0.5 hover:border-[#333] hover:bg-[#131313] hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{level}</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-current/70">/5</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <DollarSign size={14} className="text-[#5352ed]" />
                  Spending today
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={spendAmount}
                  onChange={e => setSpendAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-[#222] bg-[#080808] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#5352ed]"
                />
              </div>

              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
                <label htmlFor="daily-checkin-note" className="mb-2 block text-sm font-medium text-white">
                  Short note
                </label>
                <textarea
                  id="daily-checkin-note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={4}
                  placeholder="What stood out today?"
                  className="w-full rounded-2xl border border-[#222] bg-[#080808] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#00ff88]"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[#222] px-4 py-3 text-sm font-semibold text-[#888] transition-colors hover:bg-[#151515] hover:text-white"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-2xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save check-in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
