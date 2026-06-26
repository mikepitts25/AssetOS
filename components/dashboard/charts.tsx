"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = "hsl(215 16% 47%)";
const PRIMARY = "hsl(222 47% 24%)";
const SUCCESS = "hsl(142 71% 38%)";
const MUTED = "hsl(214 32% 80%)";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(214 32% 91%)",
  fontSize: 12,
} as const;

export function UtilizationChart({
  data,
}: {
  data: { label: string; utilization: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="util" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
            <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Utilization"]} />
        <Area
          type="monotone"
          dataKey="utilization"
          stroke={PRIMARY}
          strokeWidth={2}
          fill="url(#util)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ReservationsByPropertyChart({
  data,
}: {
  data: { property: string; reservations: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="property" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(210 40% 96%)" }} />
        <Bar dataKey="reservations" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OccupancyChart({
  occupied,
  available,
}: {
  occupied: number;
  available: number;
}) {
  const data = [
    { name: "Occupied", value: occupied, color: PRIMARY },
    { name: "Available", value: available, color: SUCCESS },
  ];
  const total = occupied + available;

  if (total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No spaces yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export const CHART_COLORS = { PRIMARY, SUCCESS, MUTED };
