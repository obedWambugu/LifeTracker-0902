import { ArrowRight, Crown, RefreshCw, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

type WeeklyReportCardProps = {
  report: any;
  loading?: boolean;
  onRefresh: () => void;
  onUpgrade: () => void;
};

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">{label}</p>
      <p className="mt-2 text-lg font-bold" style={{ color: tone, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </p>
    </div>
  );
}

export default function WeeklyReportCard({ report, loading = false, onRefresh, onUpgrade }: WeeklyReportCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-[#1a1a1a]" />
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[#101010]" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-[#101010]" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff88]">
              <Sparkles size={12} />
              Weekly life report
            </div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Report unavailable
            </h3>
            <p className="mt-2 text-sm text-[#888]">
              We could not load your weekly summary. Try refreshing to generate a new one.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a]"
        >
          Refresh report <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (report.locked) {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-gradient-to-br from-[#00ff88]/5 to-[#5352ed]/5 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff88]">
              <Crown size={12} />
              Weekly life report
            </div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Unlock your weekly story
            </h3>
            <p className="mt-2 text-sm text-[#888]">{report.summary}</p>
          </div>
          <Sparkles size={28} className="text-[#00ff88]/30" />
        </div>

        <div className="space-y-2">
          {report.highlights?.map((item: string) => (
            <div key={item} className="rounded-xl border border-dashed border-[#222] bg-[#0d0d0d] px-4 py-3 text-sm text-[#bbb]">
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a]"
        >
          Upgrade to Pro <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const days = report.days || [];
  const maxScore = Math.max(4, ...days.map((day: any) => day.score || 0));

  return (
    <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00ff88]">
            <Sparkles size={12} />
            Weekly life report
          </div>
          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            {report.title}
          </h3>
          <p className="mt-1 text-sm text-[#666]">
            {report.periodLabel} - {report.weekStart} to {report.weekEnd}
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-[#222] px-3 py-2 text-xs font-semibold text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-white"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <p className="text-sm leading-relaxed text-[#ccc]">{report.summary}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Completion" value={`${report.metrics?.completionRate ?? 0}%`} tone="#00ff88" />
        <Metric label="Check-ins" value={`${report.metrics?.checkIns ?? 0}`} tone="#5352ed" />
        <Metric label="Journal days" value={`${report.metrics?.journalDays ?? 0}`} tone="#ffa502" />
        <Metric label="Spend" value={`$${Number(report.metrics?.totalSpend ?? 0).toFixed(2)}`} tone="#ff6b81" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {report.highlights?.map((item: string) => (
          <div key={item} className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3 text-sm text-[#bbb]">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Daily rhythm</p>
            <p className="text-xs text-[#666]">A quick read on how the week flowed.</p>
          </div>
          {report.metrics?.bestDay && (
            <span className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
              Best day: {report.metrics.bestDay.date}
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day: any) => {
            const height = Math.max(12, Math.round(((day.score || 0) / maxScore) * 100));
            return (
              <div key={day.date} className="flex flex-col gap-2">
                <button
                  type="button"
                  title={`${day.date} - ${day.habitCompletions}/${day.habitTarget} habits - $${Number(day.spend || 0).toFixed(2)} spend`}
                  className="group flex h-24 items-end rounded-xl border border-[#1a1a1a] bg-[#080808] p-1 transition-colors hover:border-[#00ff88]/30"
                >
                  <div
                    className="w-full rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,136,0.18)]"
                    style={{
                      height: `${height}%`,
                      background: day.score > 0
                        ? 'linear-gradient(180deg, rgba(0,255,136,0.95), rgba(0,255,136,0.35))'
                        : '#1b1b1b',
                    }}
                  />
                </button>
                <p className="text-center text-[10px] text-[#555]">{format(new Date(`${day.date}T00:00:00`), 'EEE')}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
