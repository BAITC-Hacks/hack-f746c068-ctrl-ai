import { useEffect, type ReactNode } from 'react'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</div>
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  )
}

type BadgeTone = 'slate' | 'brand' | 'green' | 'amber' | 'rose'
const badgeTones: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
}
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTones[tone])}>{children}</span>
}

type BtnVariant = 'primary' | 'ghost' | 'danger'
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
  ghost: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  danger: 'text-rose-600 hover:bg-rose-50 disabled:opacity-50',
}
export function Button({
  children, variant = 'primary', loading, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed', btnVariants[variant], className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/70', className)} />
}

export function ProgressBar({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'green' }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', tone === 'green' ? 'bg-emerald-500' : 'bg-brand-500')}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="border-rose-200 bg-rose-50/50">
      <p className="text-sm font-medium text-rose-700">Не удалось загрузить данные</p>
      <p className="mt-1 text-sm text-rose-600">{error instanceof Error ? error.message : String(error)}</p>
      {onRetry && <Button variant="ghost" className="mt-3" onClick={onRetry}>Повторить</Button>}
    </Card>
  )
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  )
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg animate-[pop_.25s_ease-out] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm')}
      style={{ background: `hsl(${hue} 55% 50%)` }}
    >
      {initials}
    </div>
  )
}
