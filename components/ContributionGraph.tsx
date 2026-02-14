'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';

interface Submission {
  id: string;
  createdAt?: { seconds: number };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getColor(count: number): string {
  if (count === 0) return 'bg-zinc-800/60';
  if (count === 1) return 'bg-green-900';
  if (count === 2) return 'bg-green-700';
  if (count <= 4) return 'bg-green-500';
  return 'bg-green-400';
}

function getBorderColor(count: number): string {
  if (count === 0) return 'border-zinc-700/40';
  if (count === 1) return 'border-green-800';
  if (count === 2) return 'border-green-600';
  if (count <= 4) return 'border-green-400';
  return 'border-green-300';
}

export default function ContributionGraph() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`/api/submissions?contributorId=${user.uid}`);
        const data = await res.json();
        if (Array.isArray(data)) setSubmissions(data);
      } catch (err) {
        console.error('Failed to fetch submissions for graph:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [user]);

  const { weeks, monthLabels, countMap, totalCount, currentStreak, longestStreak } = useMemo(() => {
    // Build a map of date string -> count
    const map: Record<string, number> = {};
    for (const sub of submissions) {
      if (sub.createdAt?.seconds) {
        const d = new Date(sub.createdAt.seconds * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + 1;
      }
    }

    // Generate 52 weeks of dates ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start: go back ~52 weeks to the nearest Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - 363); // ~52 weeks
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const weeksArr: { date: Date; key: string; count: number }[][] = [];
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const current = new Date(start);
    let weekIndex = 0;

    while (current <= today || weeksArr.length < 52) {
      const week: { date: Date; key: string; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const d = new Date(current);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isFuture = d > today;
        week.push({
          date: d,
          key,
          count: isFuture ? -1 : (map[key] || 0),
        });

        if (d.getMonth() !== lastMonth && !isFuture) {
          lastMonth = d.getMonth();
          const lastLabel = labels[labels.length - 1];
          if (!lastLabel || weekIndex - lastLabel.weekIndex >= 3) {
            labels.push({ month: MONTHS[d.getMonth()], weekIndex });
          }
        }

        current.setDate(current.getDate() + 1);
      }
      weeksArr.push(week);
      weekIndex++;
      if (weeksArr.length >= 53) break;
    }

    // Calculate streaks
    let curStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Walk backwards from today for current streak
    const streakDate = new Date(today);
    while (true) {
      const key = `${streakDate.getFullYear()}-${String(streakDate.getMonth() + 1).padStart(2, '0')}-${String(streakDate.getDate()).padStart(2, '0')}`;
      if (map[key] && map[key] > 0) {
        curStreak++;
        streakDate.setDate(streakDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Walk all days for longest streak
    const walkDate = new Date(start);
    while (walkDate <= today) {
      const key = `${walkDate.getFullYear()}-${String(walkDate.getMonth() + 1).padStart(2, '0')}-${String(walkDate.getDate()).padStart(2, '0')}`;
      if (map[key] && map[key] > 0) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
      walkDate.setDate(walkDate.getDate() + 1);
    }

    return {
      weeks: weeksArr,
      monthLabels: labels,
      countMap: map,
      totalCount: submissions.length,
      currentStreak: curStreak,
      longestStreak: maxStreak,
    };
  }, [submissions]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="h-40 animate-pulse rounded-lg bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 relative">
      <h2 className="mb-3 text-lg font-bold font-mono">Contribution History</h2>

      {/* Streak badges */}
      <div className="mb-4 flex gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">Current</span>
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-semibold text-orange-400">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">All-Time</span>
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-semibold text-orange-400">{longestStreak} day{longestStreak !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="w-full overflow-hidden">
        <div className="relative">
          {/* Month labels */}
          <div className="relative h-5 mb-1 ml-7">
            {monthLabels.map((label, i) => (
              <span
                key={`${label.month}-${i}`}
                className="absolute text-xs text-zinc-500"
                style={{ left: `${(label.weekIndex / weeks.length) * 100}%` }}
              >
                {label.month}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="shrink-0 flex flex-col gap-[3px]">
              {DAYS.map((d, i) => (
                <div key={i} className="h-[10px] text-[10px] leading-[10px] text-zinc-500 w-6 text-right pr-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks — use flex with equal sizing */}
            <div className="flex-1 flex justify-between">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.key}
                      className={`h-[10px] w-[10px] rounded-[2px] border ${
                        day.count === -1
                          ? 'bg-transparent border-transparent'
                          : `${getColor(day.count)} ${getBorderColor(day.count)}`
                      } transition-all duration-100 ${day.count >= 0 ? 'hover:scale-150 hover:z-10 cursor-pointer' : ''}`}
                      onMouseEnter={(e) => {
                        if (day.count >= 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            date: day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                            count: day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {totalCount} contribution{totalCount !== 1 ? 's' : ''} in the past year
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Less</span>
          <div className={`h-[10px] w-[10px] rounded-[2px] bg-zinc-800/60 border border-zinc-700/40`} />
          <div className={`h-[10px] w-[10px] rounded-[2px] bg-green-900 border border-green-800`} />
          <div className={`h-[10px] w-[10px] rounded-[2px] bg-green-700 border border-green-600`} />
          <div className={`h-[10px] w-[10px] rounded-[2px] bg-green-500 border border-green-400`} />
          <div className={`h-[10px] w-[10px] rounded-[2px] bg-green-400 border border-green-300`} />
          <span className="text-xs text-zinc-500">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs shadow-xl pointer-events-none"
          style={{
            left: hoveredDay.x,
            top: hoveredDay.y - 40,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-semibold text-white">
            {hoveredDay.count} contribution{hoveredDay.count !== 1 ? 's' : ''}
          </span>
          <span className="text-zinc-400"> on {hoveredDay.date}</span>
        </div>
      )}
    </div>
  );
}
