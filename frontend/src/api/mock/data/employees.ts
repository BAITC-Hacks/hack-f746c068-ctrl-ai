import type { ActivityStatus, Grade } from '../../../types'
import { activities } from './events'
import { nextGradeOf, roleRequirements } from './skills'

export interface MockHistory {
  activityId: string
  status: ActivityStatus
  date: string
  delta?: { before: number; after: number }
}

export interface MockEmployee {
  id: string
  name: string
  role: string
  grade: Grade
  tenureMonths: number
  skills: Record<string, number>
  history: MockHistory[]
}

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()

export const employeesSeed: MockEmployee[] = [
  {
    id: 'e1', name: 'Иван Петров', role: 'Backend Engineer', grade: 'Middle', tenureMonths: 26,
    skills: { Python: 4, 'System Design': 2, Databases: 3, 'Code Review': 3, Communication: 2, Mentoring: 1 },
    history: [
      { activityId: 'a3', status: 'completed', date: d(150), delta: { before: 2, after: 3 } },
      { activityId: 'a7', status: 'completed', date: d(60), delta: { before: 2, after: 3 } },
      { activityId: 'a6', status: 'skipped', date: d(30) },
    ],
  },
  {
    id: 'e2', name: 'Анна Смирнова', role: 'Frontend Engineer', grade: 'Junior', tenureMonths: 11,
    skills: { React: 2, TypeScript: 2, 'UI/UX': 2, Testing: 1, Communication: 2, 'System Design': 0 },
    history: [{ activityId: 'a11', status: 'completed', date: d(90), delta: { before: 1, after: 2 } }],
  },
  {
    id: 'e3', name: 'Дамир Ахметов', role: 'Data Analyst', grade: 'Middle', tenureMonths: 30,
    skills: { SQL: 4, Python: 2, Statistics: 2, 'Data Visualization': 3, Communication: 3, 'Business Domain': 2 },
    history: [
      { activityId: 'a13', status: 'completed', date: d(200), delta: { before: 3, after: 4 } },
      { activityId: 'a15', status: 'declined', date: d(40) },
    ],
  },
  {
    id: 'e4', name: 'Алия Нурланова', role: 'QA Engineer', grade: 'Middle', tenureMonths: 20,
    skills: { 'Test Automation': 2, 'Test Design': 4, SQL: 2, 'CI/CD': 2, Communication: 3 },
    history: [{ activityId: 'a17', status: 'completed', date: d(120), delta: { before: 3, after: 4 } }],
  },
  {
    id: 'e5', name: 'Сергей Ким', role: 'Backend Engineer', grade: 'Senior', tenureMonths: 54,
    skills: { Python: 4, 'System Design': 4, Databases: 4, 'Code Review': 4, Communication: 3, Mentoring: 2 },
    history: [
      { activityId: 'a1', status: 'completed', date: d(300), delta: { before: 3, after: 4 } },
      { activityId: 'a5', status: 'completed', date: d(210), delta: { before: 2, after: 3 } },
    ],
  },
  {
    id: 'e6', name: 'Мария Волкова', role: 'Frontend Engineer', grade: 'Middle', tenureMonths: 34,
    skills: { React: 4, TypeScript: 3, 'UI/UX': 2, Testing: 2, Communication: 3, 'System Design': 1 },
    history: [
      { activityId: 'a8', status: 'completed', date: d(100), delta: { before: 3, after: 4 } },
      { activityId: 'a10', status: 'skipped', date: d(20) },
    ],
  },
  {
    id: 'e7', name: 'Ержан Садыков', role: 'Data Analyst', grade: 'Junior', tenureMonths: 8,
    skills: { SQL: 2, Python: 1, Statistics: 2, 'Data Visualization': 2, Communication: 2, 'Business Domain': 1 },
    history: [],
  },
  {
    // Кейс для HR: единственный разрыв — CI/CD, а подходящую активность сотрудник отклонил.
    id: 'e8', name: 'Ольга Лебедева', role: 'QA Engineer', grade: 'Junior', tenureMonths: 14,
    skills: { 'Test Automation': 2, 'Test Design': 3, SQL: 2, 'CI/CD': 1, Communication: 2 },
    history: [
      { activityId: 'a16', status: 'completed', date: d(80), delta: { before: 1, after: 2 } },
      { activityId: 'a18', status: 'declined', date: d(15) },
    ],
  },
]

// ------------------------------------------------------------
// Дополнительные сотрудники, сгенерированные детерминированно
// (одинаковые при каждом запуске), чтобы разделы были наполнены.
// ------------------------------------------------------------

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const firstM = ['Алексей', 'Дмитрий', 'Нурлан', 'Арман', 'Тимур', 'Максим', 'Руслан', 'Бауыржан', 'Андрей', 'Данияр', 'Егор', 'Асхат', 'Никита', 'Ильяс', 'Олжас']
const lastM = ['Иванов', 'Кузнецов', 'Жумабаев', 'Исмаилов', 'Попов', 'Серикбаев', 'Орлов', 'Абдрахманов', 'Морозов', 'Токаев', 'Николаев', 'Бекмуратов', 'Соколов', 'Утегенов', 'Фёдоров']
const firstF = ['Айгерим', 'Екатерина', 'Динара', 'Ольга', 'Мадина', 'Юлия', 'Асель', 'Наталья', 'Жанна', 'Ксения', 'Камила', 'Дарья', 'Салтанат', 'Виктория', 'Акмарал']
const lastF = ['Иванова', 'Кузнецова', 'Жумабаева', 'Исмаилова', 'Попова', 'Серикбаева', 'Орлова', 'Абдрахманова', 'Морозова', 'Токаева', 'Николаева', 'Бекмуратова', 'Соколова', 'Утегенова', 'Фёдорова']

const roleCounts: Record<string, number> = {
  'Backend Engineer': 8, 'Frontend Engineer': 7, 'Data Analyst': 7, 'QA Engineer': 6, 'DevOps Engineer': 8,
}

function generate(): MockEmployee[] {
  const r = rng(42)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const used = new Set(employeesSeed.map((e) => e.name))
  const out: MockEmployee[] = []
  let n = 9

  for (const [role, count] of Object.entries(roleCounts)) {
    for (let i = 0; i < count; i++) {
      let name = ''
      do {
        name = r() < 0.5 ? `${pick(firstM)} ${pick(lastM)}` : `${pick(firstF)} ${pick(lastF)}`
      } while (used.has(name))
      used.add(name)

      const x = r()
      const grade: Grade = x < 0.3 ? 'Junior' : x < 0.7 ? 'Middle' : x < 0.93 ? 'Senior' : 'Lead'
      const next = nextGradeOf(grade)
      const req = (next && roleRequirements[role][next]) || roleRequirements[role].Lead!
      const skills: Record<string, number> = {}
      for (const [skill, level] of Object.entries(req)) {
        skills[skill] = Math.max(1, level - pick([0, 0, 1, 1, 1, 2]))
      }

      const pool = activities.filter((a) => a.audience === 'all' || a.audience.includes(role))
      const history: MockHistory[] = []
      const hCount = Math.floor(r() * 4)
      for (let k = 0; k < hCount; k++) {
        const a = pick(pool)
        if (history.some((h) => h.activityId === a.id)) continue
        const s = r()
        const status = s < 0.65 ? 'completed' : s < 0.85 ? 'skipped' : 'declined'
        const cur = skills[a.skill] ?? 1
        history.push({
          activityId: a.id, status, date: d(Math.floor(10 + r() * 300)),
          ...(status === 'completed' ? { delta: { before: Math.max(0, cur - 1), after: cur } } : {}),
        })
      }

      out.push({ id: `e${n++}`, name, role, grade, tenureMonths: 3 + Math.floor(r() * 80), skills, history })
    }
  }
  // Фамилия «Токаев» остаётся только у одного сотрудника — остальным даём другие фамилии
  const altM = ['Касымов', 'Ахметжанов', 'Павлов', 'Нургалиев', 'Лебедев']
  const altF = ['Касымова', 'Ахметжанова', 'Павлова', 'Нургалиева', 'Лебедева']
  let tokaevKept = false
  for (const e of out) {
    const [first, last] = e.name.split(' ')
    if (last !== 'Токаев' && last !== 'Токаева') continue
    if (!tokaevKept) { tokaevKept = true; continue }
    const alts = last === 'Токаев' ? altM : altF
    const replacement = alts.map((l) => `${first} ${l}`).find((n) => !used.has(n))!
    used.delete(e.name)
    used.add(replacement)
    e.name = replacement
  }
  return out
}

employeesSeed.push(...generate())
