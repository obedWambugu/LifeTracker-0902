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
  { value: 'excellent', label: 'Excellent', emoji: '😄', color: '#00ff88' },
  { value: 'good', label: 'Good', emoji: '🙂', color: '#00cc6a' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#ffa502' },
  { value: 'poor', label: 'Poor', emoji: '😕', color: '#ff6b81' },
  { value: 'terrible', label: 'Terrible', emoji: '😞', color: '#ff4757' },
];

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[#1f1f1f] bg-[#111] p-5 shadow-2xl md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff88]">
              <Sparkles size={12} />
              One-tap check-in
            </div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              How is today going?
            </h2>
            <p className="mt-1 text-sm text-[#888]">
              Log mood, energy, spending, and a note in less than 10 seconds.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#222] p-2 text-[#777] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Today&apos;s progress</p>
              <p className="text-xs text-[#666]">
                {completedHabits}/{Math.max(totalHabits, 1)} habits completed
              </p>
            </div>
            <div className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
              {completedHabits > 0 ? 'You are moving' : 'Start with one small win'}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Smile size={14} className="text-[#ffa502]" />
              Mood
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {MOODS.map(option => {
                const active = mood === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-[#00ff88]/30 bg-[#00ff88]/10'
                        : 'border-[#222] bg-[#0d0d0d] hover:border-[#333] hover:bg-[#151515]'
                    }`}
                  >
                    <div className="text-lg">{option.emoji}</div>
                    <div className="mt-1 text-xs font-medium text-white">{option.label}</div>
                    <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: active ? option.color : '#222' }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Flame size={14} className="text-[#ff6b81]" />
              Energy
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  onClick={() => setEnergy(level)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                    energy === level
                      ? 'border-[#ffa502]/30 bg-[#ffa502]/10 text-[#ffa502]'
                      : 'border-[#222] bg-[#0d0d0d] text-[#666] hover:border-[#333] hover:text-white'
                  }`}
                >
                  {level}/5
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <DollarSign size={14} className="text-[#5352ed]" />
              Spending today
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={spendAmount}
              onChange={e => setSpendAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-[#222] bg-[#0d0d0d] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#5352ed]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white">Short note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="What stood out today?"
              className="w-full rounded-xl border border-[#222] bg-[#0d0d0d] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#00ff88]"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#222] px-4 py-3 text-sm font-semibold text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            Not now
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save check-in'}
          </button>
        </div>
      </div>
    </div>
  );
}
