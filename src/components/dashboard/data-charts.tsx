"use client";

import { mockCheckInData } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import type { Mood } from "@/lib/types";

const moodToValue = (mood: Mood): number => {
  if (mood === "Happy") return 3;
  if (mood === "Neutral") return 2;
  if (mood === "Sad") return 1;
  return 0;
};

const valueToMood = (value: number): string => {
  if (value === 3) return "Happy";
  if (value === 2) return "Neutral";
  if (value === 1) return "Sad";
  return "";
};

const chartConfig = {
  mood: {
    label: "Mood",
    color: "hsl(var(--chart-1))",
  },
  energy: {
    label: "Energy",
    color: "hsl(var(--chart-2))",
  },
  sleep: {
    label: "Sleep (hours)",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function DataCharts() {
  const chartData = useMemo(() => {
    return mockCheckInData.map((item) => ({
      date: item.date,
      shortDate: format(new Date(item.date), "MMM d"),
      mood: moodToValue(item.mood),
      energy: item.energy,
      sleep: item.sleep,
    }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your 7-Day Trend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Mood</h3>
          <ChartContainer config={chartConfig} className="h-[150px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 4]}
                ticks={[1, 2, 3]}
                tickFormatter={(value) => valueToMood(value)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => valueToMood(value as number)}
                    indicator="dot"
                  />
                }
              />
              <Line dataKey="mood" type="monotone" strokeWidth={2} stroke="var(--color-mood)" dot={true} />
            </LineChart>
          </ChartContainer>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Energy Level</h3>
          <ChartContainer config={chartConfig} className="h-[150px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 6]} ticks={[1,2,3,4,5]}/>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Line dataKey="energy" type="monotone" strokeWidth={2} stroke="var(--color-energy)" dot={true}/>
            </LineChart>
          </ChartContainer>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Sleep</h3>
          <ChartContainer config={chartConfig} className="h-[150px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 12]} tickFormatter={(value) => `${value}h`} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" formatter={(value) => `${value} hours`} />}
              />
              <Line dataKey="sleep" type="monotone" strokeWidth={2} stroke="var(--color-sleep)" dot={true} />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
