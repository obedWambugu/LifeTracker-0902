import type { ReactNode } from 'react';
import { ArrowRight, Crown, RefreshCw, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

type WeeklyReportCardProps = {
  report: any;
  loading?: boolean;
  onRefresh: () => void;
  onUpgrade: () => void;
};

const shellClass =
  'relative overflow-hidden rounded-[28px] border border-[#232323] bg-[#0b0b0b] shadow-[0_30px_100px_rgba(0,0,0,0.38)]';

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
    <div className="relative overflow-hidden rounded-2xl border border-[#1d1d1d] bg-[#0d0d0d] p-4">
      <div className="absolute inset-x-0 top-0 h-px opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} />
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#666]">{label}</p>
      <p className="mt-3 text-xl font-bold" style={{ color: tone, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </p>
    </div>
  );
}

function ReportShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={shellClass}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#00ff88]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#5352ed]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/25 to-transparent" />
      </div>
      <div className="relative p-5 sm:p-6">{children}</div>
    </div>
  );
}

export default function WeeklyReportCard({ report, loading = false, onRefresh, onUpgrade }: WeeklyReportCardProps) {
  if (loading) {
    return (
      <ReportShell>
        <div className="animate-pulse">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="h-6 w-44 rounded-full bg-[#161616]" />
              <div className="mt-3 h-7 w-56 rounded bg-[#161616]" />
              <div className="mt-3 h-4 w-full max-w-lg rounded bg-[#141414]" />
            </div>
            <div className="h-9 w-24 rounded-full bg-[#161616]" />
          </div>
          <div className="h-24 rounded-2xl bg-[#101010]" />
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-[#101010]" />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 rounded-2xl bg-[#101010]" />
            ))}
          </div>
          <div className="mt-4 h-40 rounded-2xl bg-[#101010]" />
        </div>
      </ReportShell>
    );
  }

  if (!report) {
    return (
      <ReportShell>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00ff88]">
              <Sparkles size={12} />
              Weekly life report
            </div>
            <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Report unavailable
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#888]">
              We could not load your weekly summary. Try refreshing to generate a new one.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a]"
        >
          Refresh report <ArrowRight size={14} />
        </button>
      </ReportShell>
    );
  }

  if (report.locked) {
    return (
      <ReportShell>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00ff88]">
              <Crown size={12} />
              Weekly life report
            </div>
            <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Unlock your weekly story
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#888]">{report.summary}</p>
          </div>
          <Sparkles size={28} className="mt-1 text-[#00ff88]/30" />
        </div>

        <div className="mt-5 grid gap-3">
          {report.highlights?.map((item: string) => (
            <div key={item} className="rounded-2xl border border-[#1d1d1d] bg-[#0d0d0d] px-4 py-3 text-sm text-[#cfcfcf]">
              {item}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onUpgrade}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#00ff88] px-4 py-3 text-sm font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a]"
        >
          Upgrade to Pro <ArrowRight size={14} />
        </button>
      </ReportShell>
    );
  }

  const days = report.days || [];
  const maxScore = Math.max(4, ...days.map((day: any) => day.score || 0));
  const completionRate = Number(report.metrics?.completionRate ?? 0);

  return (
    <ReportShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#00ff88]">
            <Sparkles size={12} />
            Weekly life report
          </div>
          <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            {report.title}
          </h3>
          <p className="mt-2 text-sm text-[#777]">
            {report.periodLabel} - {report.weekStart} to {report.weekEnd}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-[#232323] bg-[#0e0e0e] px-3 py-2 text-xs font-semibold text-[#aaa] transition-all hover:border-[#00ff88]/30 hover:text-white"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#1d1d1d] bg-[#0d0d0d] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00ff88]/10 text-[#00ff88]">
            <Sparkles size={16} />
          </div>
          <p className="text-sm leading-relaxed text-[#d8d8d8]">{report.summary}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Completion" value={`${completionRate}%`} tone="#00ff88" />
        <Metric label="Check-ins" value={`${report.metrics?.checkIns ?? 0}`} tone="#5352ed" />
        <Metric label="Journal days" value={`${report.metrics?.journalDays ?? 0}`} tone="#ffa502" />
        <Metric label="Spend" value={`$${Number(report.metrics?.totalSpend ?? 0).toFixed(2)}`} tone="#ff6b81" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {report.highlights?.map((item: string) => (
          <div key={item} className="rounded-2xl border border-[#1d1d1d] bg-[#0d0d0d] p-4 text-sm leading-relaxed text-[#d0d0d0]">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-[#1d1d1d] bg-[#090909] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Daily rhythm</p>
            <p className="mt-1 text-xs text-[#666]">A quick read on how the week flowed.</p>
          </div>
          {report.metrics?.bestDay && (
            <span className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
              Best day: {report.metrics.bestDay.date}
            </span>
          )}
        </div>

        {days.length > 0 ? (
          <div className="grid grid-cols-7 gap-3">
            {days.map((day: any) => {
              const height = Math.max(14, Math.round(((day.score || 0) / maxScore) * 100));
              return (
                <div key={day.date} className="flex flex-col gap-2">
                  <button
                    type="button"
                    title={`${day.date} - ${day.habitCompletions}/${day.habitTarget} habits - $${Number(day.spend || 0).toFixed(2)} spend`}
                    className="group flex h-32 items-end rounded-[18px] border border-[#1b1b1b] bg-gradient-to-b from-[#0b0b0b] to-[#070707] p-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00ff88]/30"
                  >
                    <div
                      className="w-full rounded-[12px] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,136,0.18)]"
                      style={{
                        height: `${height}%`,
                        background:
                          day.score > 0
                            ? 'linear-gradient(180deg, rgba(0,255,136,0.96), rgba(0,255,136,0.32))'
                            : '#1a1a1a',
                      }}
                    />
                  </button>
                  <p className="text-center text-[10px] uppercase tracking-[0.14em] text-[#555]">
                    {format(new Date(`${day.date}T00:00:00`), 'EEE')}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#222] bg-[#0b0b0b] px-4 py-8 text-center text-sm text-[#666]">
            No activity yet this week.
          </div>
        )}
      </div>
    </ReportShell>
  );
}
