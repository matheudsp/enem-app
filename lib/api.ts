// ENEM API client with improved error handling and caching

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

// Cache de questões em memória
const questionsCache = new Map<string, Question[]>()

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
 * Função genérica para fazer requisições à API com retry logic
 */
async function apiRequest<T>(
  endpoint: string, 
  options?: RequestInit, 
  params?: Record<string, any>,
  retryCount = 3,
  retryDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const url = buildUrl(endpoint, params)
      const fetchOptions = { ...DEFAULT_FETCH_OPTIONS, ...options }

      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        const errorMessage = `API returned status: ${response.status} (${response.statusText}): ${errorText}`
        console.error(errorMessage)
        
        // Specific error handling for different status codes
        if (response.status === 429) {
          // Rate limit - wait longer before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * 2))
          continue
        } else if (response.status >= 500) {
          // Server error - retry
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        } else {
          // Client error - don't retry
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }
      }

      return await response.json()
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for ${endpoint}:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Wait before retry
      if (attempt < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }
  
  throw lastError || new Error(`Failed after ${retryCount} attempts to ${endpoint}`)
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
 * Implementa cache em memória para reduzir chamadas repetidas
 */
export async function getQuestions(
  year: number,
  options: QuestionQueryOptions = {},
  fetchAll = true,
): Promise<Question[]> {
  // Create a cache key based on the year and options
  const cacheKey = `${year}-${JSON.stringify(options)}-${fetchAll}`
  
  // Check if we have this data cached
  if (questionsCache.has(cacheKey)) {
    console.log(`Using cached questions for year ${year}`)
    return questionsCache.get(cacheKey)!
  }
  
  console.log(`Fetching questions for year ${year} with options:`, options)

  const params = {
    limit: options.limit || 50, // Default é 50 por página
    offset: options.offset || 0,
    discipline: options.discipline,
    language: options.language,
  }

  try {
    // Use timeout promise to limit waiting time
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("API request timeout")), 15000)
    })
    
    const dataPromise = apiRequest<QuestionsResponse>(`/exams/${year}/questions`, undefined, params)
    
    // Race between the actual request and the timeout
    const data = await Promise.race([dataPromise, timeoutPromise]) as QuestionsResponse

    // Verificação de dados retornados
    if (!data || !data.questions || data.questions.length === 0) {
      console.log(`API returned no questions for year ${year} with the given parameters`)
      return []
    }

    // Converter para o formato padronizado da aplicação
    const formattedQuestions = data.questions.map(apiQuestionToQuestion)

    // Se não precisamos buscar todas as páginas ou se não há mais páginas, retornamos os resultados
    if (!fetchAll || !data.metadata.hasMore) {
      // Save to cache
      questionsCache.set(cacheKey, formattedQuestions)
      return formattedQuestions
    }

    // Buscar a próxima página recursivamente
    const nextOffset = params.offset + data.metadata.limit
    const nextPageQuestions = await getQuestions(year, { ...options, offset: nextOffset }, true)

    // Combinar os resultados
    const allQuestions = [...formattedQuestions, ...nextPageQuestions]
    
    // Save to cache
    questionsCache.set(cacheKey, allQuestions)
    
    return allQuestions
  } catch (error) {
    console.error(`Error fetching questions for year ${year}:`, error)
    throw error
  }
}

/**
 * Obtém uma questão específica por ID e ano
 */
export async function getQuestion(year: number, id: number): Promise<Question> {
  // First check if we have all questions for this year cached
  const allQuestionsKey = `${year}-{}-true`
  
  if (questionsCache.has(allQuestionsKey)) {
    const allQuestions = questionsCache.get(allQuestionsKey)!
    const question = allQuestions.find(q => q.id === id)
    
    if (question) {
      return question
    }
  }
  
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

/**
 * Pré-carrega todas as questões para um ano específico em segundo plano
 * Útil para melhorar a experiência do usuário carregando dados antecipadamente
 */
export function preloadQuestionsForYear(year: number): void {
  // Run this in the background without awaiting
  getQuestions(year, {}, true)
    .then(questions => {
      console.log(`Preloaded ${questions.length} questions for year ${year}`)
    })
    .catch(error => {
      console.error(`Failed to preload questions for year ${year}:`, error)
    })
}

/**
 * Limpa o cache de questões para economizar memória
 */
export function clearQuestionsCache(): void {
  questionsCache.clear()
}
