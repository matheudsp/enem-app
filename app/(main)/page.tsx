import { getExams } from "@/lib/api"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExamList } from "./exam-list"

export default async function HomePage() {
  const supabase = getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  try {
    const exams = await getExams()

    // Cache exams in the database if they don't exist
    for (const exam of exams) {
      const { data } = await supabase.from("exams").select().eq("year", exam.year).single()

      if (!data) {
        await supabase.from("exams").insert({
          year: exam.year,
          title: exam.title,
          description: exam.description || `Exame ENEM ${exam.year}`,
        })
      }
    }

    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Provas disponíveis</h1>
        <ExamList exams={exams} />
      </div>
    )
  } catch (error) {
    console.error("Error fetching exams:", error)
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Provas disponíveis</h1>
        <p className="text-red-500">Erro ao carregar as provas. Por favor, tente novamente mais tarde.</p>
      </div>
    )
  }
}
