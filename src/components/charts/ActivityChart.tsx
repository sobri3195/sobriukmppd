import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { localDate } from "../../lib/learning";
import type { State } from "../../lib/model";
export function ActivityChart({ data, days }: { data: State; days: number }) {
  const rows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const session of data.sessions) {
      const day = localDate(parseISO(session.at));
      totals.set(day, (totals.get(day) ?? 0) + session.minutes);
    }
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      return {
        day: format(date, "dd MMM"),
        menit: totals.get(localDate(date)) ?? 0,
      };
    });
  }, [data.sessions, days]);
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows}>
          <defs>
            <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            minTickGap={20}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={30}
            allowDecimals={false}
          />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="menit"
            stroke="#0d9488"
            strokeWidth={2.5}
            fill="url(#activity-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
