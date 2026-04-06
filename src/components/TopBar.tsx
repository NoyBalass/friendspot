import { useNavigate, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { Avatar } from './Avatar'

export function TopBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-14 bg-[#fafaf8]/95 backdrop-blur-md border-b border-gray-100 flex items-center px-4">
      {/* Nav buttons — left */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            pathname === '/' ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Home size={22} strokeWidth={pathname === '/' ? 2.2 : 1.7} />
        </button>
        <button
          onClick={() => navigate('/profile')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            pathname === '/profile' ? 'ring-2 ring-violet-400 ring-offset-1' : 'hover:shadow-md hover:shadow-violet-100'
          }`}
        >
          {user ? (
            <Avatar nickname={user.nickname} src={user.avatar_url} size={30} />
          ) : null}
        </button>
      </div>

      {/* Logo — centered absolutely */}
      <span className="absolute left-1/2 -translate-x-1/2 font-bold text-violet-600 text-[25px] tracking-tight select-none pointer-events-none">
        friendspots
      </span>
    </div>
  )
}
