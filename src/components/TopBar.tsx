import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { Avatar } from './Avatar'
import { SearchOverlay } from './SearchOverlay'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LAST_SEEN_KEY = 'activity_last_seen'

function useUnreadActivity(userId: string | undefined) {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    if (!userId) return
    async function check() {
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
      const { data } = await supabase
        .from('places')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!data) return
      if (!lastSeen || new Date(data.created_at) > new Date(lastSeen)) {
        setHasUnread(true)
      }
    }
    check()
  }, [userId])

  return { hasUnread, markSeen: () => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
    setHasUnread(false)
  }}
}

export function TopBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const { hasUnread, markSeen } = useUnreadActivity(user?.id)

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] h-14 bg-[#fafaf8]/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4">
        {/* Left nav */}
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
            onClick={() => { markSeen(); navigate('/profile') }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              pathname === '/profile' ? 'ring-2 ring-violet-400 ring-offset-1' : 'hover:shadow-md hover:shadow-violet-100'
            }`}
          >
            {user && (
              <div className="relative">
                <Avatar nickname={user.nickname} src={user.avatar_url} size={30} />
                {hasUnread && pathname !== '/profile' && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-[#fafaf8]" />
                )}
              </div>
            )}
          </button>
        </div>

        {/* Logo — centered */}
        <span className="absolute left-1/2 -translate-x-1/2 font-bold text-violet-600 text-[25px] tracking-tight select-none pointer-events-none">
          friendspots
        </span>

        {/* Right — search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Search size={20} />
        </button>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
