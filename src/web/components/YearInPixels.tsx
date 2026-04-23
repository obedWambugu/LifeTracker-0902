import { useEffect, useMemo, useState } from 'react';
import { eachDayOfInterval, endOfWeek, format, startOfWeek, startOfYear, endOfYear } from 'date-fns';
import { Sparkles } from 'lucide-react';

type YearInPixelsProps = {
  calendar: any;
  loading?: boolean;
};

const SCORE_COLORS = ['#101010', '#183226', '#1f5f3f', '#00a86b', '#00ff88'];

const shellClass =
  'relative overflow-hidden rounded-[28px] border border-[#232323] bg-[#0b0b0b] shadow-[0_30px_100px_rgba(0,0,0,0.38)]';

export default function YearInPixels({ calendar, loading = false }: YearInPixelsProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = calendar?.year || new Date().getFullYear();
  const yearStart = useMemo(() => startOfYear(new Date(year, 0, 1)), [year]);
  const yearEnd = useMemo(() => endOfYear(new Date(year, 0, 1)), [year]);
  const displayStart = useMemo(() => startOfWeek(yearStart, { weekStartsOn: 1 }), [yearStart]);
  const displayEnd = useMemo(() => endOfWeek(yearEnd, { weekStartsOn: 1 }), [yearEnd]);

  const dayMap = useMemo(
    () => new Map((calendar?.days || []).map((day: any) => [day.date, day])),
    [calendar]
  );

  useEffect(() => {
    if (!calendar?.days?.length) {
      setSelectedDate(null);
      return;
    }

    if (selectedDate && dayMap.has(selectedDate)) {
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const latestActive = [...calendar.days].reverse().find((day: any) => day.score > 0)?.date;
    const fallbackDate = latestActive || calendar.days[calendar.days.length - 1]?.date || today;
    setSelectedDate(dayMap.has(today) ? today : fallbackDate);
  }, [calendar, dayMap, selectedDate]);

  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return calendar?.days?.find((day: any) => day.date === selectedDate) || null;
  }, [calendar, selectedDate]);

  if (loading) {
    return (
      <div className={shellClass}>
        <div className="animate-pulse p-6">
          <div className="h-6 w-40 rounded-full bg-[#161616]" />
          <div className="mt-4 h-8 w-60 rounded bg-[#161616]" />
          <div className="mt-4 h-4 w-full max-w-md rounded bg-[#141414]" />
          <div className="mt-5 h-72 rounded-3xl bg-[#101010]" />
        </div>
      </div>
    );
  }

  const cells = eachDayOfInterval({ start: displayStart, end: displayEnd });
  const weeks: Date[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  const summaryChips = [
    { label: 'Active days', value: calendar?.summary?.activeDays ?? 0, tone: '#00ff88' },
    { label: 'Check-ins', value: calendar?.summary?.checkIns ?? 0, tone: '#5352ed' },
    { label: 'Best streak', value: calendar?.summary?.bestStreak ?? 0, tone: '#ffa502' },
  ];

  return (
    <div className={shellClass}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#5352ed]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#00ff88]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5352ed]/25 to-transparent" />
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5352ed]/20 bg-[#5352ed]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a9b1ff]">
              <Sparkles size={12} />
              Year in pixels
            </div>
            <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Consistency at a glance
            </h3>
            <p className="mt-2 text-sm text-[#777]">
              {year} - {calendar?.summary?.activeDays ?? 0} active days - {calendar?.summary?.checkIns ?? 0} check-ins
            </p>
          </div>

          <div className="rounded-2xl border border-[#1d1d1d] bg-[#0d0d0d] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Best streak</p>
            <p className="mt-1 text-2xl font-bold text-[#00ff88]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {calendar?.summary?.bestStreak ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {summaryChips.map(chip => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-2 rounded-full border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-1 text-xs font-medium text-[#d0d0d0]"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chip.tone }} />
              {chip.label}: <span style={{ color: chip.tone }}>{chip.value}</span>
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto rounded-3xl border border-[#1d1d1d] bg-[#090909] p-4">
          <div className="min-w-[760px]">
            <div
              className="mb-2 grid gap-[4px]"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {weeks.map((week, weekIndex) => {
                const firstLabel = week.find(day => day.getMonth() !== week[0].getMonth());
                return (
                  <div key={weekIndex} className="text-[10px] uppercase tracking-[0.18em] text-[#555]">
                    {weekIndex === 0 || firstLabel ? format(week[0], 'MMM') : ''}
                  </div>
                );
              })}
            </div>

            <div className="grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid gap-[4px]" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
                  {week.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayData = dayMap.get(dayKey) || null;
                    const inYear = day.getFullYear() === year;
                    const score = inYear ? Number(dayData?.score || 0) : 0;
                    const selected = selectedDate === dayKey;

                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => inYear && setSelectedDate(dayKey)}
                        aria-pressed={selected}
                        title={
                          inYear
                            ? `${dayKey} - ${dayData?.habitCompletions || 0}/${dayData?.habitTarget || 0} habits - $${Number(dayData?.spend || 0).toFixed(2)} spend`
                            : 'Outside selected year'
                        }
                        className={`aspect-square rounded-[5px] border transition-all duration-200 ${
                          inYear
                            ? 'border-[#151515] hover:scale-[1.08] hover:border-[#00ff88]/30'
                            : 'border-[#0d0d0d]'
                        } ${selected ? 'ring-2 ring-[#00ff88]/60 ring-offset-2 ring-offset-[#090909]' : ''}`}
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
            <div key={index} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] border border-[#222]" style={{ backgroundColor: color }} />
              <span>{index === 0 ? 'Rest' : index === 1 ? 'Light' : index === 2 ? 'Steady' : index === 3 ? 'Strong' : 'Great'}</span>
            </div>
          ))}
        </div>

        {selectedDay && (
          <div className="mt-5 rounded-3xl border border-[#1d1d1d] bg-[#0d0d0d] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{selectedDay.date}</p>
                <p className="mt-1 text-xs text-[#666]">
                  {selectedDay.habitCompletions}/{selectedDay.habitTarget} habits - ${Number(selectedDay.spend || 0).toFixed(2)} spend - {selectedDay.journalCount} journal entries
                </p>
              </div>
              <div className="rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
                Score {selectedDay.score}/4
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#1f1f1f] bg-[#080808] px-3 py-1 text-xs text-[#bbb]">
                Mood: {selectedDay.checkInMood || 'none recorded'}
              </span>
              <span className="rounded-full border border-[#1f1f1f] bg-[#080808] px-3 py-1 text-xs text-[#bbb]">
                Journal: {selectedDay.journalCount}
              </span>
              <span className="rounded-full border border-[#1f1f1f] bg-[#080808] px-3 py-1 text-xs text-[#bbb]">
                Spend: ${Number(selectedDay.spend || 0).toFixed(2)}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#d0d0d0]">
              {selectedDay.note ? selectedDay.note : 'No note recorded for this day.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
