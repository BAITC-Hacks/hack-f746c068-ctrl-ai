import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HrStats } from '../../types'
import { Card, CardTitle } from '../ui'

export function TopGapsChart({ data }: { data: HrStats['topGaps'] }) {
  return (
    <Card>
      <CardTitle hint="сколько сотрудников не дотягивают до требования">Самые частые разрывы</CardTitle>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <defs>
            <linearGradient id="gapBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0a84ff" />
              <stop offset="100%" stopColor="#5e5ce6" />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.06)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.5)' }}
            formatter={(v, _n, item) => [`${v} чел. (средний разрыв ${item.payload.avgGap})`, 'Сотрудников']}
            contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', boxShadow: '0 12px 32px -12px rgba(0,0,0,0.25)', fontSize: 13 }}
          />
          <Bar dataKey="employees" fill="url(#gapBar)" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
