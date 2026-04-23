import { X, Crown, Phone, Download, BarChart2, Snowflake, Infinity, Sparkles, Zap, BookOpen, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  { icon: <Infinity size={16} />, label: 'Unlimited habits', desc: 'No cap on active habits once you upgrade.' },
  { icon: <Sparkles size={16} />, label: 'Weekly life reports', desc: 'See plain-English patterns across habits, mood, and money.' },
  { icon: <BarChart2 size={16} />, label: 'Correlation insights', desc: 'See how habits, money, and mood move together.' },
  { icon: <Sparkles size={16} />, label: 'Year in pixels', desc: 'Visualize your year with a satisfying consistency grid.' },
  { icon: <BookOpen size={16} />, label: 'Journal + prompts', desc: 'Keep reflections, prompts, and tags unlocked.' },
  { icon: <Snowflake size={16} />, label: 'Streak freezes', desc: 'Protect habits when life gets messy.' },
  { icon: <Download size={16} />, label: 'Data export', desc: 'Export your progress when you need a backup.' },
  { icon: <Zap size={16} />, label: 'No ads', desc: 'Enjoy a clean, distraction-free experience.' },
];

const PLANS = [
  {
    name: 'Monthly',
    price: 'KES 300',
    suffix: '/month',
    note: 'Best for trying Pro first.',
  },
  {
    name: 'Yearly',
    price: 'KES 1,800',
    suffix: '/year',
    note: 'Pay once and save 50% vs monthly.',
  },
];

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#1f1f1f] bg-[#0d0d0d] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-[#1f1f1f] bg-gradient-to-br from-[#00ff88]/12 via-[#5352ed]/10 to-[#ffa502]/12 p-6 md:p-8">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/20 p-2 text-[#bbb] transition-colors hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00ff88]/20 text-[#00ff88]">
              <Crown size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#777]">Life Tracker Pro</p>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Upgrade to one clean plan
              </h2>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#cfcfcf]">
            Every verified account starts with a 30-day trial. Trial users keep the full feature set with ads,
            then the Free plan drops to 3 habits, no journal, no insights, no prompts, no freezes, and no export.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {['30-day trial', 'Ads removed on Pro', 'M-Pesa ready'].map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[#eaeaea]"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-b border-[#1f1f1f] p-6 md:grid-cols-2 md:p-8">
          {PLANS.map((plan, index) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-5 transition-all ${
                index === 0
                  ? 'border-[#00ff88]/30 bg-[#00ff88]/5'
                  : 'border-[#222] bg-[#111] hover:border-[#333]'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                {index === 0 && (
                  <span className="rounded-full bg-[#00ff88]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]">
                    Popular
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {plan.price}
                </span>
                <span className="pb-1 text-sm text-[#777]">{plan.suffix}</span>
              </div>
              <p className="mt-2 text-sm text-[#9a9a9a]">{plan.note}</p>
              <ul className="mt-5 space-y-3">
                {FEATURES.slice(0, 3).map(feature => (
                  <li key={`${plan.name}-${feature.label}`} className="flex items-start gap-3 text-sm text-[#d7d7d7]">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#00ff88]" />
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="p-6 md:p-8">
          <div className="grid gap-3 md:grid-cols-2">
            {FEATURES.map(feature => (
              <div key={feature.label} className="flex items-start gap-3 rounded-2xl border border-[#1f1f1f] bg-[#111] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/10 text-[#00ff88]">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#777]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Phone size={14} className="text-[#00ff88]" />
              <p className="text-sm font-semibold text-white">Pay via M-Pesa</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#777]">Paybill Number</span>
                <span className="font-mono text-white">247247</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#777]">Account Number</span>
                <span className="font-mono text-white">Your email</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#777]">Monthly amount</span>
                <span className="font-mono font-bold text-[#00ff88]">KES 300</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#777]">Yearly amount</span>
                <span className="font-mono font-bold text-[#00ff88]">KES 1,800</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-[#666]">
            Trial users keep ads and full access for 30 days. Once the trial ends, Pro removes ads and unlocks everything again.
          </p>

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-2xl border border-[#232323] px-4 py-3 text-sm font-medium text-[#bdbdbd] transition-colors hover:border-[#333] hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export function PremiumBadge({ small, label = 'PRO' }: { small?: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#00ff88]/30 bg-gradient-to-r from-[#00ff88]/20 to-[#5352ed]/20 font-semibold text-[#00ff88] ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Crown size={small ? 10 : 12} />
      {label}
    </span>
  );
}
