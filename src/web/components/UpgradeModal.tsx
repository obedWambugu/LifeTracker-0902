import { X, Zap, BarChart2, Snowflake, Infinity, Crown, Phone, Download } from 'lucide-react';

const FEATURES = [
  { icon: <Infinity size={16} />, label: 'Unlimited habits', desc: 'Free plan caps at 5' },
  { icon: <BarChart2 size={16} />, label: 'Correlation insights', desc: 'See how habits affect spending & mood' },
  { icon: <Snowflake size={16} />, label: '3 streak freezes/week', desc: 'Free plan gets 1 per week' },
  { icon: <Zap size={16} />, label: 'Advanced analytics', desc: 'Deeper charts, trends & summaries' },
  { icon: <Download size={16} />, label: 'Data export', desc: 'Export your data anytime' },
];

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl max-w-md w-full overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#00ff88]/10 via-[#5352ed]/10 to-[#ffa502]/10 p-6 pb-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#00ff88]/20 rounded-xl flex items-center justify-center">
              <Crown size={20} className="text-[#00ff88]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Life Tracker Pro
              </h2>
              <p className="text-[#888] text-xs">Unlock your full potential</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>KES 49</span>
            <span className="text-[#555] text-sm">/month</span>
            <span className="text-[#888] text-xs ml-2 bg-[#00ff88]/10 text-[#00ff88] px-2 py-0.5 rounded-full">or KES 399/year</span>
          </div>
        </div>

        {/* Features */}
        <div className="p-6 space-y-3">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#00ff88]/10 rounded-lg flex items-center justify-center flex-shrink-0 text-[#00ff88]">
                {f.icon}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{f.label}</p>
                <p className="text-[#555] text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payment */}
        <div className="px-6 pb-6">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone size={14} className="text-[#00ff88]" />
              <p className="text-white text-sm font-semibold">Pay via M-Pesa</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#555]">Paybill Number</span>
                <span className="text-white font-mono">247247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#555]">Account Number</span>
                <span className="text-white font-mono">Your email</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#555]">Amount</span>
                <span className="text-[#00ff88] font-mono font-bold">KES 49</span>
              </div>
            </div>
          </div>
          <p className="text-[#444] text-xs text-center mb-4">
            After payment, your account will be upgraded within 24 hours. Contact support for instant activation.
          </p>
          <button onClick={onClose} className="w-full py-3 rounded-xl border border-[#222] text-[#888] hover:text-white hover:border-[#333] transition-colors text-sm">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline premium badge component
export function PremiumBadge({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-[#00ff88]/20 to-[#5352ed]/20 border border-[#00ff88]/30 text-[#00ff88] rounded-full font-semibold ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
      <Crown size={small ? 10 : 12} /> PRO
    </span>
  );
}
