import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, type LinkProps } from 'react-router-dom'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[3px] border-2 px-4 py-2.5 text-sm font-semibold transition-transform active:translate-y-px disabled:opacity-40'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-iron bg-iron text-chalk',
  secondary: 'border-iron bg-paper text-iron',
  quiet: 'border-transparent bg-transparent text-steel',
  danger: 'border-plate-red bg-paper text-plate-red',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: ButtonVariant }) {
  return <Link className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className={`inline-flex size-9 items-center justify-center rounded-[3px] text-steel transition-transform active:translate-y-px hover:text-iron ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-[3px] border-2 border-iron bg-paper ${className}`}>{children}</section>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="wide text-3xl font-extrabold leading-none">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-steel">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  )
}

const INPUT_CLASS =
  'w-full rounded-[3px] border-2 border-iron bg-paper px-3 py-2.5 placeholder:text-steel/60'

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={`${INPUT_CLASS} ${className}`} {...props} />
}

export function NumberInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`${INPUT_CLASS} font-mono tabular-nums ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-steel">{hint}</span> : null}
    </label>
  )
}

export function parseNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-[3px] border-2 border-iron bg-paper">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-sm font-semibold ${
            option.value === value ? 'bg-iron text-chalk' : 'text-steel'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Meter({
  label,
  value,
  goal,
  color,
  unit = 'g',
}: {
  label: string
  value: number
  goal: number
  color: string
  unit?: string
}) {
  const percent = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className="font-mono text-sm tabular-nums">
          {Math.round(value)}
          <span className="text-steel">
            /{Math.round(goal)}
            {unit}
          </span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-[2px] border border-line bg-chalk-deep">
        <div className="h-full transition-[width] duration-300" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[3px] border-2 border-dashed border-line bg-paper/50 px-4 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-[32ch] text-sm text-steel">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-iron/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto border-t-4 border-iron bg-chalk"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-line bg-chalk px-4 py-3">
          <h2 className="wide text-lg font-bold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        <div className="px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
