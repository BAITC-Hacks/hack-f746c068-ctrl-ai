import type { HrStats } from '../../types'
import { Card, CardTitle } from '../ui'

// Средний разрыв по роли и навыку: чем темнее ячейка, тем больше разрыв
export function GapHeatmap({ data }: { data: HrStats['gapsByRole'] }) {
  const roles = [...new Set(data.map((d) => d.role))]
  const skills = [...new Set(data.map((d) => d.skill))]
  const max = Math.max(...data.map((d) => d.avgGap), 1)
  const get = (r: string, s: string) => data.find((d) => d.role === r && d.skill === s)

  return (
    <Card>
      <CardTitle hint="средний разрыв до следующего грейда">Разрывы по ролям</CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th />
              {skills.map((s) => <th key={s} className="min-w-16 px-1 pb-1 text-left font-medium text-slate-500 [writing-mode:vertical-rl] rotate-180 h-28">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r}>
                <td className="whitespace-nowrap pr-2 text-sm text-slate-700">{r}</td>
                {skills.map((s) => {
                  const c = get(r, s)
                  if (!c) return <td key={s} className="h-9 rounded-md bg-slate-50" />
                  const t = c.avgGap / max
                  return (
                    <td
                      key={s}
                      title={`${r} · ${s}: ${c.avgGap}`}
                      className="h-9 rounded-md text-center font-medium tabular-nums"
                      style={{ background: c.avgGap === 0 ? '#f1f5f9' : `rgba(79,107,237,${0.12 + t * 0.78})`, color: t > 0.55 ? '#fff' : '#334155' }}
                    >
                      {c.avgGap || '·'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
