import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { EmployeeShort, Grade } from '../types'
import { useEmployees } from '../hooks/queries'
import { Avatar, Badge, Card, EmptyState, ErrorState, ProgressBar, Skeleton, cn } from '../components/ui'

const GRADES: Grade[] = ['Junior', 'Middle', 'Senior', 'Lead']
type SortKey = 'readiness-asc' | 'readiness-desc' | 'name'

const sorters: Record<SortKey, (a: EmployeeShort, b: EmployeeShort) => number> = {
  'readiness-asc': (a, b) => a.readiness - b.readiness,
  'readiness-desc': (a, b) => b.readiness - a.readiness,
  name: (a, b) => a.name.localeCompare(b.name, 'ru'),
}

function EmployeeCard({ e }: { e: EmployeeShort }) {
  return (
    <Link to={`/employee/${e.id}`} className="group">
      <Card className="h-full p-4 transition group-hover:border-brand-500/50 group-hover:shadow-md">
        <div className="flex items-center gap-3">
          <Avatar name={e.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{e.name}</p>
            <p className="truncate text-sm text-slate-500">{e.role}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <Badge tone="brand">{e.grade}</Badge>
            {e.nextGrade && <><span className="text-slate-400">→</span><Badge>{e.nextGrade}</Badge></>}
          </span>
          <span className="font-semibold tabular-nums text-slate-800">{e.nextGrade ? `${e.readiness}%` : 'max'}</span>
        </div>
        <ProgressBar value={e.readiness} className="mt-2" tone={e.readiness >= 100 ? 'green' : 'brand'} />
      </Card>
    </Link>
  )
}

function DepartmentSection({ name, people, collapsed, onToggle }: {
  name: string; people: EmployeeShort[]; collapsed: boolean; onToggle: () => void
}) {
  const withNext = people.filter((p) => p.nextGrade)
  const avg = withNext.length ? Math.round(withNext.reduce((s, p) => s + p.readiness, 0) / withNext.length) : 100
  const lagging = withNext.filter((p) => p.readiness < 70).length

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/60">
      <button onClick={onToggle} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left">
        <span className={cn('text-slate-400 transition-transform', !collapsed && 'rotate-90')}>▸</span>
        <h2 className="text-base font-semibold text-slate-900">{name}</h2>
        <Badge>{people.length} чел.</Badge>
        {lagging > 0 && <Badge tone="amber">готовность &lt; 70%: {lagging}</Badge>}
        <span className="ml-auto flex w-full items-center gap-2 text-sm text-slate-600 sm:w-56">
          <span className="shrink-0">средняя</span>
          <ProgressBar value={avg} />
          <b className="w-10 shrink-0 text-right tabular-nums text-slate-800">{avg}%</b>
        </span>
      </button>
      {!collapsed && (
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((e) => <EmployeeCard key={e.id} e={e} />)}
        </div>
      )}
    </section>
  )
}

export function EmployeesPage() {
  const { data, isLoading, error, refetch } = useEmployees()
  // Фильтры храним в URL — при возврате из профиля они сохраняются
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const dep = params.get('dep') ?? ''
  const grade = params.get('grade') ?? ''
  const sort = (params.get('sort') as SortKey) || 'readiness-asc'
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const departments = useMemo(() => {
    const m = new Map<string, number>()
    data?.forEach((e) => m.set(e.department, (m.get(e.department) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))
  }, [data])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = (data ?? []).filter((e) =>
      (!dep || e.department === dep) &&
      (!grade || e.grade === grade) &&
      (!needle || e.name.toLowerCase().includes(needle) || e.role.toLowerCase().includes(needle)))
    const m = new Map<string, EmployeeShort[]>()
    filtered.forEach((e) => m.set(e.department, [...(m.get(e.department) ?? []), e]))
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
      .map(([name, people]) => ({ name, people: [...people].sort(sorters[sort]) }))
  }, [data, q, dep, grade, sort])

  const shown = groups.reduce((s, g) => s + g.people.length, 0)
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed[g.name])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Сотрудники</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `${data.length} сотрудников в ${departments.length} разделах` : 'Загрузка…'}
          </p>
        </div>
        {groups.length > 1 && (
          <button
            className="text-sm font-medium text-brand-600 hover:underline"
            onClick={() => setCollapsed(Object.fromEntries(groups.map((g) => [g.name, !allCollapsed])))}
          >
            {allCollapsed ? 'Развернуть все' : 'Свернуть все'}
          </button>
        )}
      </div>

      {/* Панель фильтров */}
      <Card className="mb-5 space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Поиск по имени или роли…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <select value={grade} onChange={(e) => setParam('grade', e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Все грейды</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="readiness-asc">Сначала низкая готовность</option>
            <option value="readiness-desc">Сначала высокая готовность</option>
            <option value="name">По имени</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParam('dep', '')}
            className={cn('rounded-full px-3 py-1 text-sm transition', !dep ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
          >
            Все разделы
          </button>
          {departments.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setParam('dep', dep === name ? '' : name)}
              className={cn('rounded-full px-3 py-1 text-sm transition', dep === name ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            >
              {name} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </Card>

      {error && <ErrorState error={error} onRetry={refetch} />}
      {isLoading && <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
      {data && shown === 0 && <EmptyState title="Никого не найдено" text="Измените поиск или фильтры" />}

      <div className="space-y-4">
        {groups.map((g) => (
          <DepartmentSection
            key={g.name}
            name={g.name}
            people={g.people}
            collapsed={!!collapsed[g.name]}
            onToggle={() => setCollapsed((c) => ({ ...c, [g.name]: !c[g.name] }))}
          />
        ))}
      </div>
    </div>
  )
}
