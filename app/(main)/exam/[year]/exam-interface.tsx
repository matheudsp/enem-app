"use client"

import type { Question } from "@/lib/api"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronLeft, ChevronRight, Clock, Save } from "lucide-react"

interface ExamInterfaceProps {
  year: number
  questions: Question[]
  attemptId: string
}

interface Answer {
  questionId: number
  selectedOption: string
  timeSpent: number
}

export function ExamInterface({ year, questions, attemptId }: ExamInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Initialize answers array
  useEffect(() => {
    if (questions.length > 0) {
      const initialAnswers = questions.map((q) => ({
        questionId: q.id,
        selectedOption: "",
        timeSpent: 0,
      }))
      setAnswers(initialAnswers)
    }
  }, [questions])

  // Timer for the entire exam
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleOptionSelect = (option: string) => {
    const now = new Date()
    const timeSpent = Math.floor((now.getTime() - questionStartTime.getTime()) / 1000)

    const updatedAnswers = [...answers]
    updatedAnswers[currentQuestionIndex] = {
      ...updatedAnswers[currentQuestionIndex],
      selectedOption: option,
      timeSpent: updatedAnswers[currentQuestionIndex].timeSpent + timeSpent,
    }

    setAnswers(updatedAnswers)
    setQuestionStartTime(now)

    // Save the answer to the database
    saveAnswer(currentQuestion.id, option, timeSpent)
  }

  const saveAnswer = async (questionId: number, selectedOption: string, timeSpent: number) => {
    try {
      // Check if this question already has a response
      const { data: existingResponse } = await supabase
        .from("question_responses")
        .select()
        .eq("attempt_id", attemptId)
        .eq("question_id", questionId)
        .single()

      if (existingResponse) {
        // Update existing response
        await supabase
          .from("question_responses")
          .update({
            selected_option: selectedOption,
            is_correct: selectedOption === currentQuestion.answer,
            time_spent: existingResponse.time_spent + timeSpent,
          })
          .eq("id", existingResponse.id)
      } else {
        // Create new response
        await supabase.from("question_responses").insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: selectedOption,
          is_correct: selectedOption === currentQuestion.answer,
          time_spent: timeSpent,
        })
      }
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Record time spent on current question before moving
      const now = new Date()
      const timeSpent = Math.floor((now.getTime() - questionStartTime.getTime()) / 1000)

      const updatedAnswers = [...answers]
      updatedAnswers[currentQuestionIndex] = {
        ...updatedAnswers[currentQuestionIndex],
        timeSpent: updatedAnswers[currentQuestionIndex].timeSpent + timeSpent,
      }

      setAnswers(updatedAnswers)
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setQuestionStartTime(now)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Record time spent on current question before moving
      const now = new Date()
      const timeSpent = Math.floor((now.getTime() - questionStartTime.getTime()) / 1000)

      const updatedAnswers = [...answers]
      updatedAnswers[currentQuestionIndex] = {
        ...updatedAnswers[currentQuestionIndex],
        timeSpent: updatedAnswers[currentQuestionIndex].timeSpent + timeSpent,
      }

      setAnswers(updatedAnswers)
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setQuestionStartTime(now)
    }
  }

  const handleFinishExam = async () => {
    setIsSubmitting(true)

    try {
      // Calculate final stats
      const totalQuestions = questions.length
      const answeredQuestions = answers.filter((a) => a.selectedOption !== "").length

      // Get correct answers from the database
      const { data: responses } = await supabase
        .from("question_responses")
        .select("is_correct")
        .eq("attempt_id", attemptId)

      const correctAnswers = responses?.filter((r) => r.is_correct).length || 0

      // Calculate score (0-1000)
      const score = Math.round((correctAnswers / totalQuestions) * 1000)

      // Update the attempt record
      await supabase
        .from("exam_attempts")
        .update({
          completed_at: new Date().toISOString(),
          score,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          time_spent: elapsedTime,
        })
        .eq("id", attemptId)

      // Redirect to results page
      router.push(`/results/${attemptId}`)
    } catch (error) {
      console.error("Error finishing exam:", error)
      toast({
        title: "Erro ao finalizar prova",
        description: "Ocorreu um erro ao finalizar a prova. Tente novamente.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  if (!currentQuestion) {
    return <div>Carregando...</div>
  }

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prova ENEM {year}</h1>
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Questão {currentQuestionIndex + 1} de {questions.length}
          </div>
          <div className="text-sm">
            {answers.filter((a) => a.selectedOption !== "").length} de {questions.length} respondidas
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Questão {currentQuestionIndex + 1}</h2>

                {/* Context and images */}
                {currentQuestion.context && (
                  <div
                    className="whitespace-pre-line mb-4"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.context }}
                  />
                )}

                {currentQuestion.files && currentQuestion.files.length > 0 && (
                  <div className="flex flex-col items-center gap-4 my-4">
                    {currentQuestion.files.map((file, index) => (
                      <div key={index} className="max-w-full">
                        <img
                          src={file || "/placeholder.svg"}
                          alt={`Imagem da questão ${currentQuestionIndex + 1}`}
                          className="max-w-full h-auto rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <p className="whitespace-pre-line font-medium">{currentQuestion.statement}</p>
              </div>

              <RadioGroup
                value={answers[currentQuestionIndex]?.selectedOption || ""}
                onValueChange={handleOptionSelect}
                className="space-y-3"
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.key} className="flex items-start space-x-2 border p-4 rounded-md">
                    <RadioGroupItem value={option.key} id={`option-${option.key}`} />
                    <Label htmlFor={`option-${option.key}`} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{option.key})</span>
                      <span className="whitespace-pre-line">{option.value}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              Finalizar Prova
            </Button>
          ) : (
            <Button onClick={goToNextQuestion}>
              Próxima
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Você respondeu {answers.filter((a) => a.selectedOption !== "").length} de {questions.length} questões. Tem
              certeza que deseja finalizar a prova? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishExam} disabled={isSubmitting}>
              {isSubmitting ? "Finalizando..." : "Finalizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
