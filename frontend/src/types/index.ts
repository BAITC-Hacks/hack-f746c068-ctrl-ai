// ============================================================
// API-контракт Career Quest.
// Эти типы должны совпадать с ответами FastAPI (Pydantic-схемы).
// Если бэкенд меняет формат — меняем здесь и в моках.
// ============================================================

export type Grade = 'Junior' | 'Middle' | 'Senior' | 'Lead'

export interface EmployeeShort {
  id: string
  name: string
  role: string
  department: string // раздел/отдел, по нему группируется список
  grade: Grade
  nextGrade: Grade | null
  readiness: number // 0..100, готовность к следующему grade
  avatarColor?: string
}

export interface SkillLevel {
  skill: string
  current: number // текущий уровень 0..5
  required: number // требуется для следующего grade
}

export interface Gap {
  skill: string
  current: number
  required: number
  gap: number // required - current
  critical: boolean // ключевой навык для следующего grade
}

export interface Profile {
  id: string
  name: string
  role: string
  department: string
  grade: Grade
  nextGrade: Grade | null
  tenureMonths: number
  skills: SkillLevel[]
  gaps: Gap[]
  readiness: number // 0..100
  completedCount: number
}

export interface ScoreFactor {
  key: string
  name: string // человекочитаемое название фактора
  weight: number // вес фактора в формуле, 0..1
  value: number // значение фактора для этой активности, 0..1
}

export type ActivityType = 'course' | 'mentoring' | 'project' | 'workshop' | 'certification'

export interface Recommendation {
  activityId: string
  title: string
  type: ActivityType
  skill: string
  gain: number
  maxLevel: number
  currentLevel: number
  durationHours: number
  score: number // 0..1, итоговый score
  factors: ScoreFactor[]
  explanation: string // текст от LLM
  readinessAfter: number // готовность после выполнения, 0..100
}

export type ActivityStatus = 'completed' | 'skipped' | 'declined'

export interface HistoryItem {
  activityId: string
  title: string
  skill: string
  status: ActivityStatus
  date: string // ISO
  delta?: { before: number; after: number }
}

export interface ProgressResult {
  skill: string
  before: number
  after: number
  maxLevel: number
  gain: number
  readinessBefore: number
  readinessAfter: number
  gradeUnlocked: boolean
  newRecommendations: Recommendation[]
}

export interface HrStats {
  totalEmployees: number
  avgReadiness: number
  topGaps: { skill: string; employees: number; avgGap: number }[]
  statusCounts: Record<ActivityStatus, number>
  uncovered: { id: string; name: string; role: string; department: string; grade: Grade; reason: string }[]
  gapsByRole: { role: string; skill: string; avgGap: number }[]
}
