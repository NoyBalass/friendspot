import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Pencil, X, Plus, ChevronRight, Star, MapPin, Check } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getUserGroups, createGroup } from '../lib/groups'
import { Avatar } from '../components/Avatar'
import { CategoryBadge } from '../components/CategoryBadge'
import type { Group, GroupType } from '../types'

const GROUP_TYPES: { value: GroupType; label: string; emoji: string }[] = [
  { value: 'all', label: 'Mixed', emoji: '✨' },
  { value: 'restaurant', label: 'Restaurants', emoji: '🍽' },
  { value: 'bar', label: 'Bars', emoji: '🍸' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'other', label: 'Other', emoji: '📍' },
]

function DancingDots() {
  return (
    <span className="flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white inline-block"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }} />
      ))}
    </span>
  )
}

type DrawerType = 'places' | 'reviews' | null

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ reviews: 0, places: 0 })
  const [groups, setGroups] = useState<Group[]>([])

  // drawer
  const [drawer, setDrawer] = useState<DrawerType>(null)
  const [drawerItems, setDrawerItems] = useState<any[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)

  // edit nickname
  const [editNickname, setEditNickname] = useState(false)
  const [nickValue, setNickValue] = useState('')
  const [nickSaving, setNickSaving] = useState(false)

  // create group modal
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupType, setGroupType] = useState<GroupType>('all')
  const [groupSaving, setGroupSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadStats()
      loadGroups()
    }
  }, [user])

  async function loadStats() {
    const [{ count: reviews }, { count: places }] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('places').select('id', { count: 'exact', head: true }).eq('added_by', user!.id),
    ])
    setStats({ reviews: reviews ?? 0, places: places ?? 0 })
  }

  async function loadGroups() {
    try {
      const data = await getUserGroups(user!.id)
      setGroups(data)
    } catch {}
  }

  async function openDrawer(type: DrawerType) {
    setDrawer(type)
    setDrawerLoading(true)
    setDrawerItems([])
    try {
      if (type === 'places') {
        const { data } = await supabase
          .from('places')
          .select('id, name, category, cuisine, group_id, groups(name)')
          .eq('added_by', user!.id)
          .order('created_at', { ascending: false })
        setDrawerItems(data ?? [])
      } else {
        const { data } = await supabase
          .from('reviews')
          .select('id, rating, text, created_at, place_id, places(name, group_id)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
        setDrawerItems(data ?? [])
      }
    } finally {
      setDrawerLoading(false)
    }
  }

  async function saveNickname() {
    if (!nickValue.trim()) return
    setNickSaving(true)
    try {
      const { data } = await supabase
        .from('users')
        .update({ nickname: nickValue.trim() })
        .eq('id', user!.id)
        .select()
        .single()
      if (data) setUser({ ...user!, nickname: data.nickname })
      setEditNickname(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setNickSaving(false)
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupSaving(true)
    try {
      const g = await createGroup(groupName, groupDesc, user!.id, groupType)
      setShowCreate(false)
      setGroupName('')
      setGroupDesc('')
      setGroupType('all')
      loadGroups()
      navigate(`/group/${g.id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setGroupSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-24">
      <div className="px-5 pt-16 flex flex-col gap-4">

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center"
        >
          <div className="flex justify-center mb-3">
            <Avatar nickname={user.nickname} src={user.avatar_url} size={72} />
          </div>

          {/* Nickname with edit */}
          {editNickname ? (
            <div className="flex items-center gap-2 justify-center mt-1">
              <input
                autoFocus
                value={nickValue}
                onChange={(e) => setNickValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                className="text-center text-base font-semibold border-b-2 border-violet-400 outline-none bg-transparent w-40"
              />
              <button onClick={saveNickname} disabled={nickSaving} className="text-violet-500 hover:text-violet-700">
                <Check size={16} />
              </button>
              <button onClick={() => setEditNickname(false)} className="text-gray-300 hover:text-gray-500">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNickValue(user.nickname); setEditNickname(true) }}
              className="flex items-center gap-1.5 mx-auto text-xl font-semibold text-gray-900 hover:text-violet-600 transition-colors group"
            >
              {user.nickname}
              <Pencil size={13} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
            </button>
          )}

          <p className="text-sm text-gray-400 mt-1">{user.email}</p>

          {/* Stats — clickable */}
          <div className="flex gap-4 justify-center mt-5 pt-5 border-t border-gray-50">
            <button onClick={() => openDrawer('places')} className="text-center group">
              <p className="text-2xl font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{stats.places}</p>
              <p className="text-xs text-gray-400 mt-0.5 group-hover:text-violet-400 transition-colors">Places added</p>
            </button>
            <div className="w-px bg-gray-100" />
            <button onClick={() => openDrawer('reviews')} className="text-center group">
              <p className="text-2xl font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{stats.reviews}</p>
              <p className="text-xs text-gray-400 mt-0.5 group-hover:text-violet-400 transition-colors">Reviews written</p>
            </button>
          </div>
        </motion.div>

        {/* Groups */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <p className="text-sm font-semibold text-gray-700">Your groups</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 text-xs text-violet-500 font-medium hover:text-violet-700 transition-colors"
            >
              <Plus size={13} /> New group
            </button>
          </div>

          {groups.length === 0 ? (
            <p className="text-xs text-gray-400 px-5 pb-4">No groups yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/group/${g.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-lg">{GROUP_TYPES.find(t => t.value === g.type)?.emoji ?? '✨'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">{GROUP_TYPES.find(t => t.value === g.type)?.label ?? 'Mixed'}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sign out */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all"
        >
          <LogOut size={16} /> Sign out
        </motion.button>
      </div>

      {/* Places / Reviews drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setDrawer(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white rounded-t-3xl max-h-[75svh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50 shrink-0">
                <h2 className="text-base font-semibold text-gray-900">
                  {drawer === 'places' ? 'Places you added' : 'Your reviews'}
                </h2>
                <button onClick={() => setDrawer(null)} className="text-gray-400"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 px-4 py-3">
                {drawerLoading ? (
                  <div className="flex justify-center pt-10">
                    <div className="w-5 h-5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
                  </div>
                ) : drawerItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center pt-10">Nothing here yet.</p>
                ) : drawer === 'places' ? (
                  <div className="flex flex-col gap-2">
                    {drawerItems.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setDrawer(null); navigate(`/group/${p.group_id}/place/${p.id}`) }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-violet-50 transition-colors text-left"
                      >
                        <MapPin size={15} className="text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {p.cuisine ? `${p.cuisine} · ` : ''}{(p.groups as any)?.name ?? ''}
                          </p>
                        </div>
                        <CategoryBadge category={p.category} small />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {drawerItems.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => { setDrawer(null); navigate(`/group/${(r.places as any)?.group_id}/place/${r.place_id}`) }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-violet-50 transition-colors text-left"
                      >
                        <Star size={15} className="text-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{(r.places as any)?.name ?? 'Unknown place'}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {'★'.repeat(r.rating)} {r.text ? `· ${r.text}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create group modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center px-5"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Create a group</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Group type</p>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setGroupType(t.value)}
                        className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                          groupType === t.value
                            ? 'bg-violet-500 text-white border-violet-500'
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={groupSaving || !groupName}
                  className="py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                >
                  {groupSaving ? <DancingDots /> : 'Create'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
