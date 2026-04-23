import { useMemo, useState } from 'react';
import { eachDayOfInterval, endOfWeek, format, startOfWeek, startOfYear, endOfYear } from 'date-fns';
import { Sparkles } from 'lucide-react';

type YearInPixelsProps = {
  calendar: any;
  loading?: boolean;
};

const SCORE_COLORS = [
  '#101010',
  '#183226',
  '#1f5f3f',
  '#00a86b',
  '#00ff88',
];

export default function YearInPixels({ calendar, loading = false }: YearInPixelsProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return calendar?.days?.find((day: any) => day.date === selectedDate) || null;
  }, [calendar, selectedDate]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-6">
        <div className="h-5 w-36 animate-pulse rounded bg-[#1a1a1a]" />
        <div className="mt-4 h-56 animate-pulse rounded-2xl bg-[#101010]" />
      </div>
    );
  }

  const year = calendar?.year || new Date().getFullYear();
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const displayStart = startOfWeek(yearStart, { weekStartsOn: 1 });
  const displayEnd = endOfWeek(yearEnd, { weekStartsOn: 1 });
  const dayMap = new Map((calendar?.days || []).map((day: any) => [day.date, day]));
  const cells = eachDayOfInterval({ start: displayStart, end: displayEnd });
  const weeks: Date[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return (
    <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#5352ed]/20 bg-[#5352ed]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a9b1ff]">
            <Sparkles size={12} />
            Year in pixels
          </div>
          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Consistency at a glance
          </h3>
          <p className="mt-1 text-sm text-[#666]">
            {year} - {calendar?.summary?.activeDays ?? 0} active days - {calendar?.summary?.checkIns ?? 0} check-ins
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-[#555]">Best streak</p>
          <p className="text-2xl font-bold text-[#00ff88]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {calendar?.summary?.bestStreak ?? 0}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[680px]">
          <div className="mb-2 grid grid-flow-col gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((week, weekIndex) => {
              const firstLabel = week.find(day => day.getMonth() !== week[0].getMonth());
              return (
                <div key={weekIndex} className="text-[10px] uppercase tracking-[0.16em] text-[#555]">
                  {weekIndex === 0 || firstLabel ? format(week[0], 'MMM') : ''}
                </div>
              );
            })}
          </div>

          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid gap-1" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
                {week.map(day => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayData = dayMap.get(dayKey) || null;
                  const inYear = day.getFullYear() === year;
                  const score = inYear ? Number(dayData?.score || 0) : 0;
                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => inYear && setSelectedDate(dayKey)}
                      title={
                        inYear
                          ? `${dayKey} - ${dayData?.habitCompletions || 0}/${dayData?.habitTarget || 0} habits - $${Number(dayData?.spend || 0).toFixed(2)} spend`
                          : 'Outside selected year'
                      }
                      className={`h-3.5 w-full rounded-sm border transition-all ${inYear ? 'border-[#151515] hover:border-[#00ff88]/30' : 'border-[#0d0d0d]'}`}
                      style={{ backgroundColor: SCORE_COLORS[score] || SCORE_COLORS[0] }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#666]">
        {SCORE_COLORS.map((color, index) => (
          <div key={index} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-[#222]" style={{ backgroundColor: color }} />
            <span>{index === 0 ? 'Rest' : index === 1 ? 'Light' : index === 2 ? 'Steady' : index === 3 ? 'Strong' : 'Great'}</span>
          </div>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{selectedDay.date}</p>
              <p className="text-xs text-[#666]">
                {selectedDay.habitCompletions}/{selectedDay.habitTarget} habits - ${Number(selectedDay.spend || 0).toFixed(2)} spend - {selectedDay.journalCount} journal entries
              </p>
            </div>
            <div className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
              Score {selectedDay.score}/4
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#ccc]">
            Mood: {selectedDay.checkInMood || 'none recorded'}
            {selectedDay.note ? ` - ${selectedDay.note}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
