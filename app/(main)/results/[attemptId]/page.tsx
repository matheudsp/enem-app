import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, Home, RotateCcw } from "lucide-react"

export default async function ResultsPage({
  params,
}: {
  params: { attemptId: string }
}) {
  const supabase = getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const attemptId = params.attemptId

  // Get the attempt details
  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", session.user.id)
    .single()

  if (attemptError || !attempt) {
    console.error("Error fetching attempt:", attemptError)
    redirect("/")
  }

  // If the attempt is not completed, redirect to the exam
  if (!attempt.completed_at) {
    redirect(`/exam/${attempt.exam_year}?attempt=${attemptId}`)
  }

  // Get the question responses
  const { data: responses } = await supabase.from("question_responses").select("*").eq("attempt_id", attemptId)

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Resultados da Prova</h1>
          <p className="text-muted-foreground mt-2">
            ENEM {attempt.exam_year} - {new Date(attempt.completed_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Início
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/exam/${attempt.exam_year}`}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Refazer Prova
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pontuação</CardTitle>
            <CardDescription>Sua pontuação total na prova</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{attempt.score || 0}</div>
            <Progress value={(attempt.score / 1000) * 100} className="h-2 mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acertos</CardTitle>
            <CardDescription>Questões respondidas corretamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">
              {attempt.correct_answers || 0}/{attempt.total_questions || 0}
            </div>
            <Progress value={(attempt.correct_answers / attempt.total_questions) * 100} className="h-2 mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo</CardTitle>
            <CardDescription>Tempo total gasto na prova</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center">
            <Clock className="h-8 w-8 mr-4 text-muted-foreground" />
            <div className="text-3xl font-mono">{formatTime(attempt.time_spent || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mt-12 mb-6">Detalhes das Respostas</h2>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 bg-muted p-4 font-medium">
          <div className="col-span-1">Questão</div>
          <div className="col-span-7">Resposta</div>
          <div className="col-span-2">Resultado</div>
          <div className="col-span-2">Tempo</div>
        </div>

        {responses &&
          responses.map((response, index) => (
            <div
              key={response.id}
              className={`grid grid-cols-12 p-4 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
            >
              <div className="col-span-1">{response.question_id}</div>
              <div className="col-span-7">{response.selected_option || "Não respondida"}</div>
              <div className="col-span-2">
                {response.is_correct ? (
                  <span className="text-green-600 font-medium">Correta</span>
                ) : (
                  <span className="text-red-600 font-medium">Incorreta</span>
                )}
              </div>
              <div className="col-span-2">{formatTime(response.time_spent || 0)}</div>
            </div>
          ))}
      </div>
    </div>
  )
}
