// ============================================================
// API-контракт Career Quest.
// Эти типы должны совпадать с ответами FastAPI (Pydantic-схемы).
// Если бэкенд меняет формат — меняем здесь и в моках.
// ============================================================

// Импортированный датасет может содержать собственные названия грейдов.
export type Grade = string

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
  weight: number // вес/коэффициент фактора в формуле
  value: number // значение фактора для этой активности, 0..1
}

export type ActivityType =
  | 'course'
  | 'mentoring'
  | 'project'
  | 'workshop'
  | 'certification'
  | 'meetup'
  | 'assessment'

export interface RecommendationImpact {
  skill: string
  current: number
  required: number
  gain: number
  maxLevel: number
  projected: number
  gapReduction: number
  mandatory: boolean
}

export interface Recommendation {
  activityId: string
  title: string
  type: ActivityType
  skill: string
  gain: number
  maxLevel: number
  currentLevel: number
  durationHours: number
  score: number // итоговый score; реальный backend не нормализует его к 0..1
  factors: ScoreFactor[]
  explanation: string // текст от LLM
  readinessAfter: number // готовность после выполнения, 0..100
  impacts?: RecommendationImpact[]
  gradeGapBenefit?: number
  historyMultiplier?: number
}

export type ActivityStatus = 'invited' | 'enrolled' | 'completed' | 'skipped' | 'declined'

export interface HistoryItem {
  activityId: string
  title: string
  skill: string
  status: ActivityStatus
  date: string // ISO
  delta?: { before: number; after: number }
}

export interface ProgressSkillChange {
  skill: string
  before: number
  after: number
  maxLevel: number
  gain: number
}

export interface ProgressResult {
  changes: ProgressSkillChange[]
  readinessBefore: number | null
  readinessAfter: number | null
  gradeUnlocked: boolean
  newRecommendations: Recommendation[]
}

// Отдельный контракт блока «Что, если?»: имена полей здесь намеренно
// совпадают с Pydantic-ответами backend, а не с legacy camelCase API фронтенда.
export interface DecisionSkillChange {
  skill_id: string
  before: number
  after: number
  gain: number
  max_level: number
  applied_gain: number
}

export interface DecisionReadiness {
  employee_id: string
  role: string
  current_grade: string
  target_grade: string | null
  status: 'calculated' | 'top_grade'
  readiness_percent: number | null
  mandatory_readiness_percent: number | null
  meets_mandatory: boolean | null
  skills: Record<string, {
    current: number
    required: number
    progress_percent: number
    importance: number
    mandatory: boolean
    fulfilled: boolean
  }>
}

export interface DecisionGaps {
  employee_id: string
  role: string
  current_grade: string
  target_grade: string | null
  status: 'calculated' | 'top_grade'
  total_target_skills: number
  fulfilled_target_skills: number
  skills_with_gap: number
  mandatory_skills_with_gap: number
  gaps: Record<string, {
    current: number
    required: number
    gap: number
    normalized_gap: number
    importance: number
    weighted_gap: number
    mandatory: boolean
    fulfilled: boolean
  }>
}

export interface DecisionSkillImpact {
  skill_id: string
  current: number
  required: number
  gap: number
  gain: number
  max_level: number
  projected: number
  projected_gap: number
  gap_reduction: number
  importance: number
  mandatory: boolean
  weighted_gap_reduction: number
  mandatory_factor: number
  benefit: number
}

export interface DecisionRecommendation {
  event_id: string
  title: string
  score: number
  grade_gap_benefit: number
  skill_impact: DecisionSkillImpact[]
  participation: {
    completed: number
    skipped: number
    declined: number
    same_event_completed: number
  }
  history_multiplier: number
  explanation: string
}

export interface DecisionRecommendations {
  employee_id: string
  role: string
  current_grade: string
  target_grade: string | null
  status: 'recommended' | 'top_grade' | 'no_skill_gaps' | 'no_matching_activity'
  recommendations: DecisionRecommendation[]
}

export interface ActivitySimulation {
  employee_id: string
  event_id: string
  title: string
  target_grade: string | null
  skill_changes: DecisionSkillChange[]
  readiness_before: DecisionReadiness
  readiness_after: DecisionReadiness
  gaps_before: DecisionGaps
  gaps_after: DecisionGaps
  recommendations_after: DecisionRecommendations
}

export interface ActivityComparison {
  employee_id: string
  target_grade: string | null
  first: DecisionRecommendation
  second: DecisionRecommendation
  preferred_event_id: string
  score_delta: number
  explanation: string
  readiness_after_first: DecisionReadiness
  readiness_after_second: DecisionReadiness
}

export interface HrStats {
  totalEmployees: number
  avgReadiness: number | null
  topGaps: { skill: string; employees: number; avgGap: number }[]
  statusCounts: Record<ActivityStatus, number>
  uncovered: { id: string; name: string; role: string; department: string; grade: Grade; reason: string }[]
  gapsByRole: { role: string; skill: string; avgGap: number }[]
  activities: {
    id: string
    title: string
    totalRecords: number
    uniqueEmployees: number
    statusCounts: Record<ActivityStatus, number>
  }[]
}
