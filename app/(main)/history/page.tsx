import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function HistoryPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Get all completed attempts
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("user_id", session.user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  // Group attempts by year
  const attemptsByYear =
    attempts?.reduce((acc, attempt) => {
      const year = attempt.exam_year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(attempt);
      return acc;
    }, {} as Record<number, typeof attempts>) || {};

  // Sort years in descending order
  const sortedYears = Object.keys(attemptsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Provas</h1>
          <p className="text-muted-foreground mt-2">
            Todas as suas tentativas anteriores
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar provas..."
              className="pl-8"
            />
          </div>
          <Button asChild>
            <Link href="/">Nova Prova</Link>
          </Button>
        </div>
      </div>

      {sortedYears.length > 0 ? (
        <div className="space-y-8">
          {sortedYears.map((year) => (
            <div key={year}>
              <h2 className="text-xl font-semibold mb-4">ENEM {year}</h2>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-muted p-4 font-medium">
                  <div className="col-span-3">Data</div>
                  <div className="col-span-2">Pontuação</div>
                  <div className="col-span-2">Acertos</div>
                  <div className="col-span-2">Tempo</div>
                  <div className="col-span-3"></div>
                </div>

                {attemptsByYear[year]?.map((attempt, index) => (
                  <div
                    key={attempt.id}
                    className={`grid grid-cols-12 p-4 ${
                      index % 2 === 0 ? "bg-background" : "bg-muted/30"
                    }`}
                  >
                    <div className="col-span-3">
                      <p>
                        {new Date(attempt.completed_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.completed_at).toLocaleTimeString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-bold">{attempt.score || 0}</p>
                    </div>
                    <div className="col-span-2">
                      <p>
                        {attempt.correct_answers || 0}/
                        {attempt.total_questions || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(
                          (attempt.correct_answers / attempt.total_questions) *
                            100
                        )}
                        %
                      </p>
                    </div>
                    <div className="col-span-2">
                      {formatTime(attempt.time_spent || 0)}
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/results/${attempt.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Resultados
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma prova encontrada</CardTitle>
            <CardDescription>
              Você ainda não completou nenhuma prova.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Iniciar Primeira Prova</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Format time as HH:MM:SS
function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
