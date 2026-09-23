import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HrStats } from '../../types'
import { Card, CardTitle } from '../ui'

export function TopGapsChart({ data }: { data: HrStats['topGaps'] }) {
  return (
    <Card>
      <CardTitle hint="сколько сотрудников не дотягивают до требования">Самые частые разрывы</CardTitle>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            formatter={(v, _n, item) => [`${v} чел. (средний разрыв ${item.payload.avgGap})`, 'Сотрудников']}
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <Bar dataKey="employees" fill="#4f6bed" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
