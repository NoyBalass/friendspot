import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Avatar } from '../components/Avatar'

export function ProfilePage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ reviews: 0, places: 0 })

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  async function loadStats() {
    const [{ count: reviews }, { count: places }] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('places').select('id', { count: 'exact', head: true }).eq('added_by', user!.id),
    ])
    setStats({ reviews: reviews ?? 0, places: places ?? 0 })
  }

  if (!user) return null

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-24">
      <div className="px-5 pt-16">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center"
        >
          <div className="flex justify-center mb-3">
            <Avatar nickname={user.nickname} src={user.avatar_url} size={72} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{user.nickname}</h1>
          <p className="text-sm text-gray-400 mt-1">{user.email}</p>

          <div className="flex gap-4 justify-center mt-5 pt-5 border-t border-gray-50">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{stats.places}</p>
              <p className="text-xs text-gray-400 mt-0.5">Places added</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{stats.reviews}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reviews written</p>
            </div>
          </div>
        </motion.div>

        {/* Sign out */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          onClick={signOut}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all"
        >
          <LogOut size={16} /> Sign out
        </motion.button>
      </div>
    </div>
  )
}
