"use client"

import type { Exam } from "@/lib/api"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarIcon, ClockIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface ExamListProps {
  exams: Exam[]
}

export function ExamList({ exams }: ExamListProps) {
  const router = useRouter()
  const [startingExam, setStartingExam] = useState<number | null>(null)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  const startExam = async (year: number) => {
    setStartingExam(year)
    try {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Check if the user has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || "",
        })

        if (insertError) {
          throw insertError
        }
      }

      // Create a new exam attempt
      const { data: attemptData, error } = await supabase
        .from("exam_attempts")
        .insert({
          exam_year: year,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Redirect to the exam page
      router.push(`/exam/${year}?attempt=${attemptData.id}`)
    } catch (error) {
      console.error("Error starting exam:", error)
      toast({
        title: "Erro ao iniciar prova",
        description: "Ocorreu um erro ao iniciar a prova. Tente novamente.",
        variant: "destructive",
      })
      setStartingExam(null)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => (
        <Card key={exam.year} className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>{exam.title}</CardTitle>
            <CardDescription>
              <div className="flex items-center mt-2">
                <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                <span>Ano {exam.year}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{exam.description || `Exame ENEM do ano de ${exam.year}`}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href={`/exam/${exam.year}/info`}>Detalhes</Link>
            </Button>
            <Button onClick={() => startExam(exam.year)} disabled={startingExam === exam.year}>
              {startingExam === exam.year ? (
                <>
                  <ClockIcon className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                "Iniciar Prova"
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
