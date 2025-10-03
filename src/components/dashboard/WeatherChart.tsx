"use client"

import { Line, LineChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { WeatherForecast } from "@/lib/types"

interface WeatherChartProps {
  data: WeatherForecast[];
}

export function WeatherChart({ data }: WeatherChartProps) {
  if (!data || data.length === 0) {
    return null
  }
  
  return (
    <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: -10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--card-foreground))"
              }}
              labelStyle={{ fontWeight: 'bold' }}
              formatter={(value, name) => [`${value}°C`, name === 'temp' ? 'Avg Temp' : name === 'max' ? 'Max Temp' : 'Min Temp']}
            />
            <Line type="monotone" dataKey="temp" stroke="hsl(var(--primary))" strokeWidth={2} name="Avg Temp" dot={false} />
            <Line type="monotone" dataKey="max" stroke="hsl(var(--chart-3))" strokeWidth={1} name="Max" dot={false} />
            <Line type="monotone" dataKey="min" stroke="hsl(var(--chart-2))" strokeWidth={1} name="Min" dot={false} />
          </LineChart>
        </ResponsiveContainer>
    </div>
  )
}