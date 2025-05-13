import { getExam } from "@/lib/api"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, ClockIcon, FileTextIcon } from "lucide-react"

export default async function ExamInfoPage({
  params,
}: {
  params: { year: string }
}) {
  const supabase = getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const year = Number.parseInt(params.year)

  try {
    const exam = await getExam(year)

    // Get user's previous attempts for this exam
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("exam_year", year)
      .eq("user_id", session.user.id)
      .order("started_at", { ascending: false })

    return (
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{exam.title}</h1>
            <p className="text-muted-foreground mt-2">Informações sobre a prova e seus resultados anteriores</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button asChild>
              <Link href={`/exam/${year}`}>Iniciar Prova</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sobre a prova</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 opacity-70" />
                <span>Ano: {year}</span>
              </div>
              <div className="flex items-center">
                <FileTextIcon className="mr-2 h-5 w-5 opacity-70" />
                <span>Questões: 90 questões de múltipla escolha</span>
              </div>
              <div className="flex items-center">
                <ClockIcon className="mr-2 h-5 w-5 opacity-70" />
                <span>Tempo estimado: 5 horas</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {exam.description ||
                  `Exame ENEM do ano de ${year}. Esta prova contém questões de múltipla escolha que avaliam conhecimentos em diversas áreas.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suas tentativas anteriores</CardTitle>
              <CardDescription>Histórico de tentativas para esta prova</CardDescription>
            </CardHeader>
            <CardContent>
              {attempts && attempts.length > 0 ? (
                <div className="space-y-4">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{new Date(attempt.started_at).toLocaleDateString("pt-BR")}</p>
                          <p className="text-sm text-muted-foreground">
                            {attempt.completed_at
                              ? `Concluída em ${new Date(attempt.completed_at).toLocaleTimeString("pt-BR")}`
                              : "Não concluída"}
                          </p>
                        </div>
                        {attempt.completed_at && (
                          <div className="text-right">
                            <p className="font-bold text-lg">{attempt.score || 0}</p>
                            <p className="text-sm text-muted-foreground">
                              {attempt.correct_answers || 0}/{attempt.total_questions || 90} acertos
                            </p>
                          </div>
                        )}
                      </div>
                      {attempt.completed_at && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/results/${attempt.id}`}>Ver resultados</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Você ainda não realizou esta prova.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" asChild>
                <Link href={`/exam/${year}`}>Iniciar Nova Tentativa</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error fetching exam info:", error)
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Informações da Prova</h1>
        <p className="text-red-500">Erro ao carregar as informações da prova. Por favor, tente novamente mais tarde.</p>
        <Button className="mt-4" asChild>
          <Link href="/">Voltar para a lista de provas</Link>
        </Button>
      </div>
    )
  }
}
