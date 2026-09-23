// ============================================================
// Упрощённая копия логики бэкенда — только для мок-режима.
// Нужна, чтобы демо работало без FastAPI: скоринг, прогресс, HR-статистика.
// На реальном API всё это считает бэкенд, фронт только отображает.
// ============================================================
import type {
  EmployeeShort, Gap, HistoryItem, HrStats, Profile, ProgressResult, Recommendation, ScoreFactor,
} from '../../types'
import { activities, type MockActivity } from './data/events'
import { employeesSeed, type MockEmployee } from './data/employees'
import { departmentOfRole, nextGradeOf, roleRequirements } from './data/skills'

const dept = (role: string) => departmentOfRole[role] ?? 'Прочее'

// In-memory «база данных»: сбрасывается при перезагрузке страницы
let db: MockEmployee[] = structuredClone(employeesSeed)
export const resetDb = () => { db = structuredClone(employeesSeed) }

const WEIGHTS = {
  gapCoverage: 0.3,
  criticality: 0.2,
  readinessImpact: 0.15,
  effectiveGain: 0.15,
  historyFit: 0.1,
  roleFit: 0.1,
}

const FACTOR_NAMES: Record<keyof typeof WEIGHTS, string> = {
  gapCoverage: 'Закрывает разрыв',
  criticality: 'Критичность навыка',
  readinessImpact: 'Рост готовности к grade',
  effectiveGain: 'Эффективный gain (с учётом max_level)',
  historyFit: 'История участия',
  roleFit: 'Соответствие роли',
}

const getEmp = (id: string) => db.find((e) => e.id === id)
const getAct = (id: string) => activities.find((a) => a.id === id)!
const round = (n: number) => Math.round(n * 100) / 100

function requirements(emp: MockEmployee) {
  const next = nextGradeOf(emp.grade)
  return next ? roleRequirements[emp.role]?.[next] ?? {} : {}
}

function calcReadiness(skills: Record<string, number>, req: Record<string, number>) {
  const keys = Object.keys(req)
  if (!keys.length) return 100
  const sum = keys.reduce((s, k) => s + Math.min(skills[k] ?? 0, req[k]) / req[k], 0)
  return Math.round((sum / keys.length) * 100)
}

function calcGaps(emp: MockEmployee): Gap[] {
  const req = requirements(emp)
  return Object.entries(req)
    .map(([skill, required]) => {
      const current = emp.skills[skill] ?? 0
      const gap = Math.max(required - current, 0)
      return { skill, current, required, gap, critical: gap >= 2 }
    })
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
}

function explain(emp: MockEmployee, act: MockActivity, g: Gap, after: number, rBefore: number, rAfter: number, completedSameType: number) {
  const next = nextGradeOf(emp.grade)
  const parts = [
    `Для грейда ${next} ${emp.role} требуется ${act.skill} уровня ${g.required}, сейчас — ${g.current}.`,
    `Активность «${act.title}» повысит навык до ${after}${after === act.maxLevel && g.current + act.gain > act.maxLevel ? ` (упор в max_level = ${act.maxLevel})` : ''}.`,
  ]
  if (g.critical) parts.push('Это один из ключевых разрывов для следующего грейда.')
  if (after >= g.required) parts.push('После неё разрыв по этому навыку будет закрыт полностью.')
  if (completedSameType > 0) parts.push(`Сотрудник уже успешно завершил ${completedSameType} активност${completedSameType === 1 ? 'ь' : 'и'} такого формата.`)
  parts.push(`Готовность к ${next}: ${rBefore}% → ${rAfter}%.`)
  return parts.join(' ')
}

function recommend(emp: MockEmployee, limit = 3): Recommendation[] {
  const req = requirements(emp)
  const gaps = calcGaps(emp)
  const readiness = calcReadiness(emp.skills, req)
  const usedIds = new Set(emp.history.map((h) => h.activityId))

  const recs: Recommendation[] = []
  for (const act of activities) {
    if (usedIds.has(act.id)) continue
    const g = gaps.find((x) => x.skill === act.skill)
    if (!g) continue
    const roleOk = act.audience === 'all' || act.audience.includes(emp.role)
    if (!roleOk) continue

    const after = Math.min(g.current + act.gain, act.maxLevel)
    const effGain = after - g.current
    if (effGain <= 0) continue

    const rAfter = calcReadiness({ ...emp.skills, [act.skill]: after }, req)
    const sameType = emp.history.filter((h) => getAct(h.activityId).type === act.type)
    const completedSameType = sameType.filter((h) => h.status === 'completed').length
    const rejectedSameType = sameType.length - completedSameType

    const values: Record<keyof typeof WEIGHTS, number> = {
      gapCoverage: Math.min(effGain, g.gap) / g.gap,
      criticality: g.critical ? 1 : 0.4,
      readinessImpact: Math.min((rAfter - readiness) / 15, 1),
      effectiveGain: effGain / act.gain,
      historyFit: Math.max(0, Math.min(1, 0.5 + 0.25 * completedSameType - 0.25 * rejectedSameType)),
      roleFit: act.audience === 'all' ? 0.7 : 1,
    }
    const factors: ScoreFactor[] = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => ({
      key: k, name: FACTOR_NAMES[k], weight: WEIGHTS[k], value: round(values[k]),
    }))
    const score = round(factors.reduce((s, f) => s + f.weight * f.value, 0))

    recs.push({
      activityId: act.id, title: act.title, type: act.type, skill: act.skill,
      gain: act.gain, maxLevel: act.maxLevel, currentLevel: g.current, durationHours: act.durationHours,
      score, factors, readinessAfter: rAfter,
      explanation: explain(emp, act, g, after, readiness, rAfter, completedSameType),
    })
  }
  return recs.sort((a, b) => b.score - a.score).slice(0, limit)
}

// ---------------- Публичные функции (ответы «API») ----------------

export function listEmployees(): EmployeeShort[] {
  return db.map((e) => ({
    id: e.id, name: e.name, role: e.role, department: dept(e.role), grade: e.grade, nextGrade: nextGradeOf(e.grade),
    readiness: calcReadiness(e.skills, requirements(e)),
  }))
}

export function getProfile(id: string): Profile | null {
  const e = getEmp(id)
  if (!e) return null
  const req = requirements(e)
  const skillNames = Array.from(new Set([...Object.keys(req), ...Object.keys(e.skills)]))
  return {
    id: e.id, name: e.name, role: e.role, department: dept(e.role), grade: e.grade, nextGrade: nextGradeOf(e.grade),
    tenureMonths: e.tenureMonths,
    skills: skillNames.map((s) => ({ skill: s, current: e.skills[s] ?? 0, required: req[s] ?? 0 })),
    gaps: calcGaps(e),
    readiness: calcReadiness(e.skills, req),
    completedCount: e.history.filter((h) => h.status === 'completed').length,
  }
}

export function getRecommendations(id: string): Recommendation[] {
  const e = getEmp(id)
  return e ? recommend(e) : []
}

export function getHistory(id: string): HistoryItem[] {
  const e = getEmp(id)
  if (!e) return []
  return [...e.history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((h) => {
      const a = getAct(h.activityId)
      return { activityId: h.activityId, title: a.title, skill: a.skill, status: h.status, date: h.date, delta: h.delta }
    })
}

export function completeActivity(empId: string, actId: string): ProgressResult | null {
  const e = getEmp(empId)
  const act = activities.find((a) => a.id === actId)
  if (!e || !act) return null
  const req = requirements(e)
  const before = e.skills[act.skill] ?? 0
  const after = Math.min(before + act.gain, act.maxLevel) // new_skill = min(old + gain, max_level)
  const readinessBefore = calcReadiness(e.skills, req)
  e.skills[act.skill] = after
  e.history.push({ activityId: actId, status: 'completed', date: new Date().toISOString(), delta: { before, after } })
  const readinessAfter = calcReadiness(e.skills, req)
  return {
    skill: act.skill, before, after, maxLevel: act.maxLevel, gain: act.gain,
    readinessBefore, readinessAfter, gradeUnlocked: readinessAfter >= 100,
    newRecommendations: recommend(e),
  }
}

export function rejectActivity(empId: string, actId: string, status: 'skipped' | 'declined') {
  const e = getEmp(empId)
  if (!e) return false
  e.history.push({ activityId: actId, status, date: new Date().toISOString() })
  return true
}

export function getHrStats(): HrStats {
  const gapAgg = new Map<string, { employees: number; total: number }>()
  const roleAgg = new Map<string, { total: number; n: number }>()
  const statusCounts = { completed: 0, skipped: 0, declined: 0 }
  const uncovered: HrStats['uncovered'] = []
  let readinessSum = 0

  for (const e of db) {
    const gaps = calcGaps(e)
    readinessSum += calcReadiness(e.skills, requirements(e))
    for (const g of gaps) {
      const cur = gapAgg.get(g.skill) ?? { employees: 0, total: 0 }
      gapAgg.set(g.skill, { employees: cur.employees + 1, total: cur.total + g.gap })
    }
    for (const [skill, required] of Object.entries(requirements(e))) {
      const key = `${e.role}|${skill}`
      const cur = roleAgg.get(key) ?? { total: 0, n: 0 }
      roleAgg.set(key, { total: cur.total + Math.max(required - (e.skills[skill] ?? 0), 0), n: cur.n + 1 })
    }
    for (const h of e.history) statusCounts[h.status]++
    if (gaps.length && recommend(e).length === 0) {
      uncovered.push({
        id: e.id, name: e.name, role: e.role, department: dept(e.role), grade: e.grade,
        reason: `Нет доступных активностей по разрывам: ${gaps.map((g) => g.skill).join(', ')}`,
      })
    }
  }

  return {
    totalEmployees: db.length,
    avgReadiness: Math.round(readinessSum / db.length),
    topGaps: [...gapAgg.entries()]
      .map(([skill, v]) => ({ skill, employees: v.employees, avgGap: round(v.total / v.employees) }))
      .sort((a, b) => b.employees - a.employees || b.avgGap - a.avgGap)
      .slice(0, 8),
    statusCounts,
    uncovered,
    gapsByRole: [...roleAgg.entries()].map(([k, v]) => {
      const [role, skill] = k.split('|')
      return { role, skill, avgGap: round(v.total / v.n) }
    }),
  }
}
