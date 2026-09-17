import { Apple, CalendarDays, Dumbbell, Scale, Target } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Today', icon: CalendarDays, end: true },
  { to: '/lift', label: 'Lift', icon: Dumbbell, end: false },
  { to: '/food', label: 'Food', icon: Apple, end: false },
  { to: '/habits', label: 'Habits', icon: Target, end: false },
  { to: '/weight', label: 'Weight', icon: Scale, end: false },
]

export function Shell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main className="flex-1 px-4 pt-6 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-iron bg-iron">
        <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold tracking-wide ${
                  isActive ? 'bg-chalk text-iron' : 'text-chalk/60'
                }`
              }
            >
              <Icon size={20} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
