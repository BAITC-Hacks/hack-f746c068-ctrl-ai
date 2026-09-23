import { useEffect, type ReactNode } from 'react'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// Стеклянная карточка (Liquid Glass)
export function Card({ children, className, interactive }: { children: ReactNode; className?: string; interactive?: boolean }) {
  return <div className={cn('glass rounded-4xl p-6', interactive && 'hover-lift', className)}>{children}</div>
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{children}</h2>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-sm font-semibold text-brand-600">{eyebrow}</p>}
        <h1 className="text-4xl font-semibold tracking-tightest text-slate-900 sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-slate-600">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

type BadgeTone = 'slate' | 'brand' | 'green' | 'amber' | 'rose'
const badgeTones: Record<BadgeTone, string> = {
  slate: 'bg-white/70 text-slate-700 ring-1 ring-black/5',
  brand: 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500/15',
  green: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15',
  amber: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/15',
}
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur', badgeTones[tone])}>{children}</span>
}

type BtnVariant = 'primary' | 'ghost' | 'danger'
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-[0_6px_20px_-6px_rgba(0,113,227,0.6)] hover:bg-[#0077ed] disabled:bg-brand-600/50 disabled:shadow-none',
  ghost: 'bg-white/70 text-slate-800 ring-1 ring-black/5 backdrop-blur hover:bg-white disabled:opacity-50',
  danger: 'text-rose-600 hover:bg-rose-500/10 disabled:opacity-50',
}
export function Button({
  children, variant = 'primary', loading, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
        btnVariants[variant], className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-4xl bg-white/50 ring-1 ring-white/60', className)} />
}

export function ProgressBar({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'green' }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-black/[0.06]', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-1000 ease-out',
          tone === 'green' ? 'bg-gradient-to-r from-[#30d158] to-[#34c759]' : 'bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]',
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="!bg-rose-50/70">
      <p className="text-sm font-semibold text-rose-700">Не удалось загрузить данные</p>
      <p className="mt-1 text-sm text-rose-600">{error instanceof Error ? error.message : String(error)}</p>
      {onRetry && <Button variant="ghost" className="mt-4" onClick={onRetry}>Повторить</Button>}
    </Card>
  )
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="glass rounded-4xl p-10 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="glass-strong w-full max-w-lg animate-[pop_.35s_cubic-bezier(.2,.8,.2,1)] rounded-4xl p-7" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// Аватар с мягким градиентом, цвет стабилен для имени
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_12px_-4px_rgba(0,0,0,0.25)]',
        size === 'lg' ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm',
      )}
      style={{ background: `linear-gradient(145deg, hsl(${hue} 85% 66%), hsl(${(hue + 40) % 360} 70% 48%))` }}
    >
      {initials}
    </div>
  )
}
