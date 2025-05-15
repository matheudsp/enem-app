import { getQuestions } from "@/lib/api"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExamInterface } from "./exam-interface"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: { year: string }
  searchParams: { attempt?: string }
}) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const year = Number.parseInt(params.year)
  const attemptId = searchParams.attempt

  // If no attempt ID is provided, create one and redirect
  if (!attemptId) {
    // Check if the user has a profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      // Create profile if it doesn't exist
      await supabase.from("profiles").insert({
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata.full_name || "",
      })
    }

    // Create a new attempt
    const { data: attemptData, error } = await supabase
      .from("exam_attempts")
      .insert({
        exam_year: year,
        user_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return (
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-8">Erro</h1>
          <p className="text-red-500 mb-4">
            Ocorreu um erro ao iniciar a prova: {error.message}. Por favor, tente novamente.
          </p>
          <Button asChild>
            <Link href="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      )
    }

    // Redirect outside of any try/catch block
    redirect(`/exam/${year}?attempt=${attemptData.id}`)
  }

  // Check if the attempt exists and belongs to the current user
  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", session.user.id)
    .single()

  if (attemptError || !attempt) {
    console.error("Error fetching attempt:", attemptError)
    redirect(`/exam/${year}/info`)
  }

  // If the attempt is already completed, redirect to results
  if (attempt.completed_at) {
    redirect(`/results/${attemptId}`)
  }

  try {
    // Get questions for the exam
    const questions = await getQuestions(year)

    if (!questions || questions.length === 0) {
      // Delete the attempt if no questions are found
      await supabase.from("exam_attempts").delete().eq("id", attemptId)

      return (
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-8">Sem questões disponíveis</h1>
          <p className="text-red-500 mb-4">
            Não foram encontradas questões para o ENEM {year}. Por favor, escolha outro ano.
          </p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="container py-4">
        <ExamInterface year={year} questions={questions} attemptId={attemptId} />
      </div>
    )
  } catch (error) {
    console.error("Error fetching questions:", error)

    // Update the attempt to mark it as invalid
    await supabase.from("exam_attempts").delete().eq("id", attemptId)

    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Erro ao carregar questões</h1>
        <p className="text-red-500 mb-4">
          Não foi possível carregar as questões para o ENEM {year}.
          {error instanceof Error ? ` ${error.message}` : " Ocorreu um erro desconhecido."}
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/">Voltar para a página inicial</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/exam/${year}/info`}>Ver informações da prova</Link>
          </Button>
        </div>
      </div>
    )
  }
}
