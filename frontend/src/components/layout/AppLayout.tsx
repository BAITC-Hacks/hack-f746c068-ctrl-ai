import { NavLink, Outlet } from 'react-router-dom'
import { USE_MOCK } from '../../api/client'
import { cn } from '../ui'

const link = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900')

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-4 flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">CQ</span>
            Career Quest
          </NavLink>
          <nav className="flex gap-1">
            <NavLink to="/" end className={link}>Сотрудники</NavLink>
            <NavLink to="/hr" className={link}>HR-аналитика</NavLink>
          </nav>
          {USE_MOCK && (
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800" title="VITE_USE_MOCK=true">
              Mock API
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
