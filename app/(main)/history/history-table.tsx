"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, ArrowUpDown, Search, Calendar } from "lucide-react"
import Link from "next/link"

type ExamAttempt = {
  id: string
  exam_year: number
  completed_at: string
  score: number
  correct_answers: number
  total_questions: number
  time_spent: number
}

interface HistoryTableProps {
  attempts: ExamAttempt[]
}

export function HistoryTable({ attempts }: HistoryTableProps) {
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [searchQuery, setSearchQuery] = useState("")

  // Get unique years for the filter dropdown
  const uniqueYears = useMemo(() => {
    const years = [...new Set(attempts.map((attempt) => attempt.exam_year))].sort((a, b) => b - a)
    return years
  }, [attempts])

  // Filter and sort the attempts
  const filteredAttempts = useMemo(() => {
    let filtered = [...attempts]

    // Apply year filter
    if (yearFilter !== "all") {
      filtered = filtered.filter((attempt) => attempt.exam_year === Number.parseInt(yearFilter))
    }

    // Apply search filter (search by year)
    if (searchQuery) {
      filtered = filtered.filter((attempt) => attempt.exam_year.toString().includes(searchQuery))
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.completed_at).getTime()
      const dateB = new Date(b.completed_at).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [attempts, yearFilter, sortOrder, searchQuery])

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="search"
              placeholder="Search by year..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full md:w-48 space-y-1">
          <label htmlFor="year-filter" className="text-sm font-medium">
            Filter by Year
          </label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger id="year-filter" className="w-full">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  ENEM {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          className="w-full md:w-auto"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Correct Answers</TableHead>
              <TableHead>Time Spent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttempts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No exam attempts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">ENEM {attempt.exam_year}</TableCell>
                  <TableCell>{new Date(attempt.completed_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <span className="font-bold">{attempt.score || 0}</span>
                  </TableCell>
                  <TableCell>
                    {attempt.correct_answers || 0}/{attempt.total_questions || 0}
                    <div className="text-xs text-muted-foreground">
                      {Math.round(((attempt.correct_answers || 0) / (attempt.total_questions || 1)) * 100)}%
                    </div>
                  </TableCell>
                  <TableCell>{formatTime(attempt.time_spent || 0)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/results/${attempt.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Results
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
