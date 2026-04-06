import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Pencil, X, Plus, ChevronRight, Star, MapPin, Check, Settings, Trash2, Bell, BellOff, Camera, ImagePlus, Bookmark, Share2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { resizeImage } from '../lib/imageUtils'
import { useT, useLangStore, type Lang } from '../lib/i18n'

const LANGS: { value: Lang; flag: string; label: string }[] = [
  { value: 'en', flag: '🇬🇧', label: 'English' },
  { value: 'he', flag: '🇮🇱', label: 'עברית' },
]
import { getUserGroups, createGroup, updateGroup, deleteGroup } from '../lib/groups'
import { getPermissionState, requestAndSubscribe, unsubscribe } from '../lib/notifications'
import { Avatar } from '../components/Avatar'
import { CategoryBadge } from '../components/CategoryBadge'
import type { Group, GroupType } from '../types'

const GROUP_TYPES: { value: GroupType; label: string; emoji: string }[] = [
  { value: 'all', label: 'Mixed', emoji: '✨' },
  { value: 'restaurant', label: 'Restaurants', emoji: '🍽' },
  { value: 'bar', label: 'Bars', emoji: '🍸' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'bakery', label: 'Bakery', emoji: '🥐' },
  { value: 'dessert', label: 'Dessert', emoji: '🍦' },
  { value: 'nightclub', label: 'Nightclub', emoji: '🎉' },
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

type DrawerType = 'places' | 'reviews' | 'wishlist' | null

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useLangStore()
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

  // edit group
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editType, setEditType] = useState<GroupType>('all')
  const [editSaving, setEditSaving] = useState(false)

  // delete group
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // avatar
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const avatarGalleryRef = useRef<HTMLInputElement>(null)
  const avatarCameraRef = useRef<HTMLInputElement>(null)

  // notifications
  const [notifPermission, setNotifPermission] = useState<ReturnType<typeof getPermissionState>>('default')
  const [notifLoading, setNotifLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadStats()
      loadGroups()
      setNotifPermission(getPermissionState())
    }
  }, [user?.id])

  async function handleNotifToggle() {
    if (!user) return
    setNotifLoading(true)
    try {
      if (notifPermission === 'granted') {
        await unsubscribe(user.id)
        setNotifPermission('default')
      } else {
        const result = await requestAndSubscribe(user.id)
        if (result === 'granted') setNotifPermission('granted')
        else if (result === 'denied') setNotifPermission('denied')
      }
    } finally {
      setNotifLoading(false)
    }
  }

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
      } else if (type === 'reviews') {
        const { data } = await supabase
          .from('reviews')
          .select('id, rating, text, created_at, place_id, places(name, group_id)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
        setDrawerItems(data ?? [])
      } else if (type === 'wishlist') {
        const { data } = await supabase
          .from('place_checkins')
          .select('id, created_at, place:places(id, name, category, cuisine, group_id, groups(name))')
          .eq('user_id', user!.id)
          .eq('status', 'want')
          .order('created_at', { ascending: false })
        setDrawerItems((data ?? []).map((r: any) => r.place).filter(Boolean))
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

  function openEditGroup(g: Group) {
    setEditingGroup(g)
    setEditName(g.name)
    setEditDesc(g.description ?? '')
    setEditType((g.type ?? 'all') as GroupType)
  }

  async function saveEditGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroup) return
    setEditSaving(true)
    try {
      await updateGroup(editingGroup.id, { name: editName, description: editDesc, type: editType })
      setEditingGroup(null)
      loadGroups()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setDeleting(true)
    try {
      await deleteGroup(groupId)
      loadGroups()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setConfirmDeleteId(null)
      setDeleting(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setShowAvatarPicker(false)
    setAvatarUploading(true)
    try {
      const compressed = await resizeImage(file, 400, 0.85)
      const path = `avatars/${user.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage.from('photos').upload(path, compressed, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      // Append a version param so browsers don't serve the old cached image
      const urlWithVersion = `${publicUrl}?v=${Date.now()}`
      const { error } = await supabase.from('users').update({ avatar_url: urlWithVersion }).eq('id', user.id)
      if (error) throw error
      setUser({ ...user, avatar_url: urlWithVersion })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAvatarUploading(false)
      // reset inputs so same file can be re-selected
      if (avatarGalleryRef.current) avatarGalleryRef.current.value = ''
      if (avatarCameraRef.current) avatarCameraRef.current.value = ''
    }
  }

  if (!user) return null

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-10">
      <div className="px-5 pt-6 flex flex-col gap-4">

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center"
        >
          <div className="flex justify-center mb-3">
            <div className="relative inline-block">
              <button
                onClick={() => setShowAvatarPicker(true)}
                disabled={avatarUploading}
                className="relative block rounded-full focus:outline-none"
              >
                {avatarUploading ? (
                  <div className="w-[72px] h-[72px] rounded-full bg-gray-100 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
                  </div>
                ) : (
                  <Avatar nickname={user.nickname} src={user.avatar_url} size={72} />
                )}
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-violet-500 border-2 border-white flex items-center justify-center shadow-sm">
                  <Camera size={11} className="text-white" />
                </span>
              </button>
              <input ref={avatarGalleryRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <input ref={avatarCameraRef} type="file" accept="image/*" capture="environment" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>

          {/* Avatar picker popup */}
          <AnimatePresence>
            {showAvatarPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
                onClick={() => setShowAvatarPicker(false)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm bg-white rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl"
                >
                  <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                  <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Change profile photo</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowAvatarPicker(false); setTimeout(() => avatarGalleryRef.current?.click(), 100) }}
                      className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-gray-50 hover:bg-violet-50 transition-colors"
                    >
                      <ImagePlus size={22} className="text-violet-500" />
                      <span className="text-xs font-medium text-gray-600">Gallery</span>
                    </button>
                    <button
                      onClick={() => { setShowAvatarPicker(false); setTimeout(() => avatarCameraRef.current?.click(), 100) }}
                      className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-gray-50 hover:bg-violet-50 transition-colors"
                    >
                      <Camera size={22} className="text-violet-500" />
                      <span className="text-xs font-medium text-gray-600">Camera</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
          <div className="flex gap-3 justify-center mt-5 pt-5 border-t border-gray-50">
            <button onClick={() => openDrawer('places')} className="text-center group flex-1">
              <p className="text-2xl font-bold text-gray-900 group-hover:text-violet-600 transition-colors">{stats.places}</p>
              <p className="text-xs text-gray-400 mt-0.5 group-hover:text-violet-400 transition-colors flex items-center justify-center gap-0.5"><MapPin size={10} /> {t.profile.places}</p>
            </button>
            <div className="w-px bg-gray-100" />
            <button onClick={() => openDrawer('reviews')} className="text-center group flex-1">
              <p className="text-2xl font-bold text-gray-900 group-hover:text-violet-600 transition-colors">{stats.reviews}</p>
              <p className="text-xs text-gray-400 mt-0.5 group-hover:text-violet-400 transition-colors">{t.profile.reviews}</p>
            </button>
            <div className="w-px bg-gray-100" />
            <button onClick={() => openDrawer('wishlist')} className="text-center group flex-1">
              <div className="flex justify-center">
                <Bookmark size={22} className="text-gray-900 group-hover:text-violet-600 transition-colors" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 group-hover:text-violet-400 transition-colors">{t.profile.wishlist}</p>
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
            <p className="text-sm font-semibold text-gray-700">{t.profile.yourGroups}</p>
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
                <div key={g.id}>
                  <div
                    onClick={() => navigate(`/group/${g.id}`)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-violet-50 flex items-center justify-center shrink-0">
                      {g.cover_photo
                        ? <img src={g.cover_photo} alt={g.name} className="w-full h-full object-cover" />
                        : <span className="text-base">{GROUP_TYPES.find(t => t.value === g.type)?.emoji ?? '✨'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{g.name}</p>
                      <p className="text-xs text-gray-400">{GROUP_TYPES.find(t => t.value === g.type)?.label ?? 'Mixed'}</p>
                    </div>
                    {g.created_by === user.id ? (
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEditGroup(g)} className="text-gray-300 hover:text-violet-500 transition-colors">
                          <Settings size={14} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(g.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    )}
                  </div>

                  <AnimatePresence>
                    {confirmDeleteId === g.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden px-4 pb-2"
                      >
                        <div className="bg-red-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                          <p className="text-xs text-red-500 font-medium">Delete this group?</p>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Cancel</button>
                            <button
                              onClick={() => handleDeleteGroup(g.id)}
                              disabled={deleting}
                              className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 disabled:opacity-50"
                            >
                              {deleting ? '...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Notifications */}
        {notifPermission !== 'unsupported' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            onClick={handleNotifToggle}
            disabled={notifLoading || notifPermission === 'denied'}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-medium active:scale-95 transition-all disabled:opacity-50 ${
              notifPermission === 'granted'
                ? 'border-violet-200 text-violet-600 bg-violet-50'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {notifPermission === 'granted' ? <BellOff size={16} /> : <Bell size={16} />}
            {notifLoading
              ? '...'
              : notifPermission === 'granted'
              ? t.profile.notificationsOff
              : notifPermission === 'denied'
              ? t.profile.notificationsBlocked
              : t.profile.notifications}
          </motion.button>
        )}

        {/* Language picker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.13 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">{t.profile.language}</p>
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                  lang === l.value
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-violet-200'
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Share app */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14 }}
          onClick={async () => {
            const text = 'Check out friendspots — restaurant & bar recommendations from people you actually trust 🍽'
            const url = window.location.origin
            if (navigator.share) {
              try { await navigator.share({ title: 'friendspots', text, url }); return } catch {}
            }
            await navigator.clipboard.writeText(`${text}\n${url}`)
            alert('Link copied!')
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-violet-200 text-violet-600 bg-violet-50 text-sm font-medium hover:bg-violet-100 active:scale-95 transition-all"
        >
          <Share2 size={16} /> {t.profile.shareApp}
        </motion.button>

        {/* Sign out */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all"
        >
          <LogOut size={16} /> {t.profile.signOut}
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
                  {drawer === 'places' ? 'Places you added' : drawer === 'reviews' ? 'Your reviews' : '🔖 Wishlist'}
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
                ) : drawer === 'places' || drawer === 'wishlist' ? (
                  <div className="flex flex-col gap-2">
                    {drawerItems.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setDrawer(null); navigate(`/group/${p.group_id}/place/${p.id}`) }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-violet-50 transition-colors text-left"
                      >
                        {drawer === 'wishlist'
                          ? <Bookmark size={15} className="text-violet-400 shrink-0" />
                          : <MapPin size={15} className="text-violet-400 shrink-0" />
                        }
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

      {/* Edit group modal */}
      <AnimatePresence>
        {editingGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center px-5"
            onClick={() => setEditingGroup(null)}
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
                <h2 className="text-lg font-semibold text-gray-900">Edit group</h2>
                <button onClick={() => setEditingGroup(null)} className="text-gray-400"><X size={20} /></button>
              </div>
              <form onSubmit={saveEditGroup} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Group name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Group type</p>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setEditType(t.value)}
                        className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                          editType === t.value
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
                  disabled={editSaving}
                  className="py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                >
                  {editSaving ? <DancingDots /> : 'Save changes'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
