import { NavLink, Outlet } from 'react-router-dom'
import { USE_MOCK } from '../../api/client'
import { cn } from '../ui'

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-1.5 text-sm font-medium transition duration-200',
    isActive ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]' : 'text-slate-600 hover:text-slate-900',
  )

export function AppLayout() {
  return (
    <div className="min-h-screen">
      {/* Плавающая стеклянная навигация */}
      <header className="sticky top-3 z-40 px-4">
        <div className="glass-strong mx-auto flex max-w-6xl items-center gap-2 rounded-full py-2 pl-3 pr-2">
          <NavLink to="/" className="mr-2 flex items-center gap-2.5 font-semibold tracking-tight text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#bf5af2] text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              CQ
            </span>
            <span className="hidden sm:inline">Career Quest</span>
          </NavLink>
          <nav className="flex gap-1 rounded-full bg-black/[0.04] p-1">
            <NavLink to="/" end className={link}>Сотрудники</NavLink>
            <NavLink to="/hr" className={link}>HR-аналитика</NavLink>
          </nav>
          {USE_MOCK && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-black/5" title="VITE_USE_MOCK=true">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Mock API
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10">
        <Outlet />
      </main>
    </div>
  )
}
