import { useNavigate, useLocation } from 'react-router-dom'
import { Home, User } from 'lucide-react'

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: User, label: 'Profile', path: '/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center h-16 z-50">
      {items.map(({ icon: Icon, label, path }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1 px-6 py-2"
          >
            <Icon
              size={22}
              className={active ? 'text-violet-500' : 'text-gray-300'}
              strokeWidth={active ? 2 : 1.5}
            />
            <span className={`text-xs font-medium ${active ? 'text-violet-500' : 'text-gray-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
