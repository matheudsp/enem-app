import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HistoryTable } from "./history-table"

export default async function HistoryPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Get all completed attempts
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("user_id", session.user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Exam History</h1>
          <p className="text-muted-foreground mt-2">View and filter your previous exam attempts</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button asChild>
            <Link href="/">New Exam</Link>
          </Button>
        </div>
      </div>

      {attempts && attempts.length > 0 ? (
        <HistoryTable attempts={attempts} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No exams found</CardTitle>
            <CardDescription>You haven't completed any exams yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Take Your First Exam</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
