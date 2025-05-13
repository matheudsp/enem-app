import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ExternalLink } from "lucide-react"
import { DashboardChart } from "./dashboard-chart"

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  // Get completed attempts
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("user_id", session.user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })

  // Calculate stats
  const totalAttempts = attempts?.length || 0
  const averageScore = attempts?.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / (totalAttempts || 1)
  const totalTimeSpent = attempts?.reduce((sum, attempt) => sum + (attempt.time_spent || 0), 0) || 0

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Get recent attempts for the chart
  const recentAttempts = attempts?.slice(0, 5) || []

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Bem-vindo, {profile?.full_name || session.user.email}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button asChild>
            <Link href="/">Iniciar Nova Prova</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Provas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">Provas completadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pontuação Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(averageScore)}</div>
            <Progress value={(averageScore / 1000) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
            <div className="text-2xl font-mono">{formatTime(totalTimeSpent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Prova</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts && attempts.length > 0 ? (
              <>
                <div className="text-2xl font-bold">{attempts[0].score}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(attempts[0].completed_at).toLocaleDateString("pt-BR")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma prova completada</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Progresso</CardTitle>
            <CardDescription>Pontuação das suas últimas provas</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart attempts={recentAttempts} />
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Provas Recentes</CardTitle>
            <CardDescription>Suas últimas provas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {attempts && attempts.length > 0 ? (
              <div className="space-y-4">
                {attempts.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">ENEM {attempt.exam_year}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.completed_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{attempt.score}</p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.correct_answers}/{attempt.total_questions}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/results/${attempt.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Ver resultados</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Você ainda não completou nenhuma prova.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
