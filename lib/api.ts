// ENEM API client

/**
 * Interface para representar um exame/prova do ENEM
 */
export interface Exam {
  id: number
  year: number
  title: string
  description?: string
}

/**
 * Interface para arquivo relacionado à questão
 */
export interface QuestionFile {
  url: string
}

/**
 * Interface para representar uma alternativa de questão
 */
export interface QuestionAlternative {
  letter: string
  text: string
  file: string | null
  isCorrect: boolean
}

/**
 * Interface para representar questões conforme retornadas pela API
 */
export interface ApiQuestion {
  title: string
  index: number
  discipline: string
  language?: string
  year: number
  context: string
  files: string[]
  correctAlternative: string
  alternativesIntroduction: string
  alternatives: QuestionAlternative[]
}

/**
 * Interface padronizada para questões em nossa aplicação
 */
export interface Question {
  id: number
  statement: string
  options: {
    key: string
    value: string
  }[]
  answer: string
  explanation?: string
  subject?: string
  context?: string
  files?: string[]
}

/**
 * Interface para representar os parâmetros de consulta para busca de questões
 */
export interface QuestionQueryOptions {
  limit?: number
  offset?: number
  discipline?: string
  language?: string
}

/**
 * Interface para resposta da API com questões paginadas
 */
export interface QuestionsResponse {
  metadata: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
  questions: ApiQuestion[]
}

// URL base da API
const API_BASE_URL = "https://api.enem.dev/v1"

// Configurações padrão para requisições
const DEFAULT_FETCH_OPTIONS = {
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  cache: "no-store" as RequestCache,
}

/**
 * Função para construir o URL com parâmetros de consulta
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

/**
 * Função genérica para fazer requisições à API
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit, params?: Record<string, any>): Promise<T> {
  try {
    const url = buildUrl(endpoint, params)
    const fetchOptions = { ...DEFAULT_FETCH_OPTIONS, ...options }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      console.error(`API returned status: ${response.status} (${response.statusText}): ${errorText}`)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Obtém a lista de todos os exames disponíveis
 */
export async function getExams(): Promise<Exam[]> {
  return apiRequest<Exam[]>("/exams")
}

/**
 * Obtém informações detalhadas sobre um exame específico por ano
 */
export async function getExam(year: number): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${year}`)
}

/**
 * Obtém todas as questões de um determinado ano de exame, com suporte à paginação
 * Essa função busca recursivamente todas as páginas de questões quando fetchAll=true
 */
export async function getQuestions(
  year: number,
  options: QuestionQueryOptions = {},
  fetchAll = true,
): Promise<Question[]> {
  console.log(`Fetching questions for year ${year} with options:`, options)

  const params = {
    limit: options.limit || 50, // Default é 100 conforme API
    offset: options.offset || 0,
    discipline: options.discipline,
    language: options.language,
  }

  try {
    const data = await apiRequest<QuestionsResponse>(`/exams/${year}/questions`, undefined, params)

    // Verificação de dados retornados
    if (!data || !data.questions || data.questions.length === 0) {
      console.log(`API returned no questions for year ${year} with the given parameters`)
      return []
    }

    // Converter para o formato padronizado da aplicação
    const formattedQuestions = data.questions.map(apiQuestionToQuestion)

    // Se não precisamos buscar todas as páginas ou se não há mais páginas, retornamos os resultados
    if (!fetchAll || !data.metadata.hasMore) {
      return formattedQuestions
    }

    // Buscar a próxima página recursivamente
    const nextOffset = params.offset + data.metadata.limit
    const nextPageQuestions = await getQuestions(year, { ...options, offset: nextOffset }, true)

    // Combinar os resultados
    return [...formattedQuestions, ...nextPageQuestions]
  } catch (error) {
    console.error(`Error fetching questions for year ${year}:`, error)
    throw error
  }
}

/**
 * Obtém uma questão específica por ID e ano
 */
export async function getQuestion(year: number, id: number): Promise<Question> {
  try {
    const response = await apiRequest<ApiQuestion>(`/exams/${year}/questions/${id}`)

    return apiQuestionToQuestion(response)
  } catch (error) {
    console.error(`Error fetching question ${id} for year ${year}:`, error)
    throw error
  }
}

/**
 * Função auxiliar para converter uma questão da API para o formato padronizado
 */
function apiQuestionToQuestion(apiQuestion: ApiQuestion): Question {
  return {
    id: apiQuestion.index,
    statement: apiQuestion.alternativesIntroduction,
    context: apiQuestion.context,
    files: apiQuestion.files,
    options: apiQuestion.alternatives.map((alt) => ({
      key: alt.letter,
      value: alt.text,
    })),
    answer: apiQuestion.correctAlternative,
    subject: apiQuestion.discipline,
  }
}

/**
 * Obtém questões filtradas por disciplina
 */
export async function getQuestionsByDiscipline(year: number, discipline: string, fetchAll = true): Promise<Question[]> {
  return getQuestions(year, { discipline }, fetchAll)
}

/**
 * Obtém questões com paginação controlada manualmente
 */
export async function getPaginatedQuestions(
  year: number,
  page = 0,
  pageSize = 10,
  options: Omit<QuestionQueryOptions, "limit" | "offset"> = {},
): Promise<{
  questions: Question[]
  currentPage: number
  totalPages: number
  totalQuestions: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}> {
  const offset = page * pageSize

  const params = {
    ...options,
    limit: pageSize,
    offset,
  }

  try {
    const data = await apiRequest<QuestionsResponse>(`/exams/${year}/questions`, undefined, params)

    const formattedQuestions = data.questions.map(apiQuestionToQuestion)
    const totalPages = Math.ceil(data.metadata.total / pageSize)

    return {
      questions: formattedQuestions,
      currentPage: page,
      totalPages,
      totalQuestions: data.metadata.total,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
    }
  } catch (error) {
    console.error(`Error fetching paginated questions for year ${year}:`, error)
    throw error
  }
}
