"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Attempt {
  id: string
  exam_year: number
  score: number
  completed_at: string
}

interface DashboardChartProps {
  attempts: Attempt[]
}

export function DashboardChart({ attempts }: DashboardChartProps) {
  // Format data for the chart
  const data = attempts
    .slice()
    .reverse()
    .map((attempt) => ({
      name: `ENEM ${attempt.exam_year}`,
      score: attempt.score || 0,
      date: new Date(attempt.completed_at).toLocaleDateString("pt-BR"),
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Nenhum dado disponível para exibir</p>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
          <YAxis domain={[0, 1000]} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`${value}`, "Pontuação"]}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "8px",
            }}
          />
          <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
