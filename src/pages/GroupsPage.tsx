import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Link, X, Copy, Check, Settings, Trash2, ImagePlus, Camera } from 'lucide-react'

function DancingDots() {
  return (
    <span className="flex items-center justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white inline-block"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </span>
  )
}
import { useAuthStore } from '../store/useAuthStore'
import { getUserGroups, createGroup, joinGroupByCode, updateGroup, deleteGroup, uploadGroupCoverPhoto } from '../lib/groups'
import { Avatar } from '../components/Avatar'
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

export function GroupsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modal, setModal] = useState<null | 'create' | 'join'>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [groupType, setGroupType] = useState<GroupType>('all')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editType, setEditType] = useState<GroupType>('all')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null)
  const editGalleryRef = useRef<HTMLInputElement>(null)
  const editCameraRef = useRef<HTMLInputElement>(null)
  const [createCoverFile, setCreateCoverFile] = useState<File | null>(null)
  const [createCoverPreview, setCreateCoverPreview] = useState<string | null>(null)
  const createGalleryRef = useRef<HTMLInputElement>(null)
  const createCameraRef = useRef<HTMLInputElement>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) load()
    else setLoading(false)
  }, [user?.id])

  async function load() {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await Promise.race([
        getUserGroups(user!.id),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
      ])
      setGroups(data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const group = await createGroup(name, desc, user!.id, groupType)
      if (createCoverFile) await uploadGroupCoverPhoto(group.id, createCoverFile)
      setModal(null)
      setName('')
      setDesc('')
      setGroupType('all')
      setCreateCoverFile(null)
      setCreateCoverPreview(null)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await joinGroupByCode(code, user!.id)
      setModal(null)
      setCode('')
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openEditGroup(group: Group) {
    setEditingGroup(group)
    setEditName(group.name)
    setEditDesc(group.description ?? '')
    setEditType((group.type ?? 'all') as GroupType)
    setEditCoverFile(null)
    setEditCoverPreview(group.cover_photo ?? null)
  }

  async function saveEditGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroup) return
    setEditSaving(true)
    try {
      if (editCoverFile) await uploadGroupCoverPhoto(editingGroup.id, editCoverFile)
      await updateGroup(editingGroup.id, { name: editName, description: editDesc, type: editType })
      setEditingGroup(null)
      load()
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
      setConfirmDeleteId(null)
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  function copyInvite(group: Group) {
    const url = `${window.location.origin}/join/${group.invite_code}`
    navigator.clipboard.writeText(url)
    setCopied(group.id)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-10">
      {/* Header */}
      <div className="sticky top-14 bg-[#fafaf8]/90 backdrop-blur-md z-10 px-5 pt-4 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Your groups</h1>
        <p className="text-sm text-gray-400 mt-0.5">Places you actually trust</p>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
          </div>
        ) : loadError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-16 text-gray-400">
            <p className="text-sm mb-3">Failed to load groups.</p>
            <button onClick={load} className="text-xs text-violet-500 font-medium hover:text-violet-700">Retry</button>
          </motion.div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center pt-16 text-gray-400"
          >
            <div className="text-4xl mb-3">🌍</div>
            <p className="text-sm">No groups yet. Create one or join with an invite link.</p>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-50 overflow-hidden flex items-center justify-center text-lg shrink-0">
                    {group.cover_photo
                      ? <img src={group.cover_photo} alt={group.name} className="w-full h-full object-cover" />
                      : GROUP_TYPES.find(t => t.value === group.type)?.emoji ?? '✨'
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p dir="auto" className="font-semibold text-gray-900 text-base">{group.name}</p>
                    {group.members && group.members.length > 0 ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex">
                          {group.members.slice(0, 5).map((m: any, i: number) => (
                            <div key={m.id} className="rounded-full border-2 border-white" style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 5 - i }}>
                              <Avatar nickname={m.nickname} src={m.avatar_url} size={20} />
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 truncate">
                          {group.members.slice(0, 2).map((m: any) => m.nickname).join(', ')}
                          {group.members.length > 2 ? ` +${group.members.length - 2}` : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {GROUP_TYPES.find(t => t.value === group.type)?.label ?? 'Mixed'}
                      </p>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {confirmDeleteId === group.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-2"
                    >
                      <div className="bg-red-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                        <p className="text-xs text-red-500 font-medium">Delete this group and all its places?</p>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Cancel</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id) }}
                            disabled={deleting}
                            className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deleting ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <button
                    onClick={() => copyInvite(group)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors"
                  >
                    {copied === group.id ? (
                      <><Check size={13} className="text-emerald-500" /> Link copied!</>
                    ) : (
                      <><Copy size={13} /> Copy invite link</>
                    )}
                  </button>
                  {group.created_by === user?.id && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditGroup(group) }}
                        className="flex items-center gap-1 text-xs text-gray-300 hover:text-violet-500 transition-colors"
                      >
                        <Settings size={13} /> Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(group.id) }}
                        className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setModal('create')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={16} /> Create group
          </button>
          <button
            onClick={() => setModal('join')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Link size={16} /> Join group
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center px-5"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {modal === 'create' ? 'Create a group' : 'Join a group'}
                </h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {modal === 'create' ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-4">
                  {/* Cover photo */}
                  <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center">
                    {createCoverPreview ? (
                      <>
                        <img src={createCoverPreview} alt="cover" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setCreateCoverFile(null); setCreateCoverPreview(null) }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white">
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => createGalleryRef.current?.click()}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors">
                          <ImagePlus size={12} /> Photo
                        </button>
                        <button type="button" onClick={() => createCameraRef.current?.click()}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors">
                          <Camera size={12} /> Camera
                        </button>
                      </div>
                    )}
                  </div>
                  <input ref={createGalleryRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCreateCoverFile(f); setCreateCoverPreview(URL.createObjectURL(f)) } }} />
                  <input ref={createCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCreateCoverFile(f); setCreateCoverPreview(URL.createObjectURL(f)) } }} />
                  <input
                    type="text"
                    placeholder="Group name"
                    value={name}
                    dir="auto"
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={desc}
                    dir="auto"
                    onChange={(e) => setDesc(e.target.value)}
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
                    disabled={saving}
                    className="py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {saving ? <DancingDots /> : 'Create'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Invite code or paste link"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {saving ? <DancingDots /> : 'Join'}
                  </button>
                </form>
              )}
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
                {/* Cover photo */}
                <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 border-dashed flex items-center justify-center">
                  {editCoverPreview ? (
                    <>
                      <img src={editCoverPreview} alt="cover" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setEditCoverFile(null); setEditCoverPreview(null) }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white">
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editGalleryRef.current?.click()}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors">
                        <ImagePlus size={12} /> Photo
                      </button>
                      <button type="button" onClick={() => editCameraRef.current?.click()}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500 transition-colors">
                        <Camera size={12} /> Camera
                      </button>
                    </div>
                  )}
                </div>
                <input ref={editGalleryRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setEditCoverFile(f); setEditCoverPreview(URL.createObjectURL(f)) } }} />
                <input ref={editCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setEditCoverFile(f); setEditCoverPreview(URL.createObjectURL(f)) } }} />
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
