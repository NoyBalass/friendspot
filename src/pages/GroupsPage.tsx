import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Link, X, Copy, Check, Settings, Trash2 } from 'lucide-react'

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
import { getUserGroups, createGroup, joinGroupByCode, updateGroup, deleteGroup } from '../lib/groups'
import type { Group, GroupType } from '../types'

const GROUP_TYPES: { value: GroupType; label: string; emoji: string }[] = [
  { value: 'all', label: 'Mixed', emoji: '✨' },
  { value: 'restaurant', label: 'Restaurants', emoji: '🍽' },
  { value: 'bar', label: 'Bars', emoji: '🍸' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'other', label: 'Other', emoji: '📍' },
]

export function GroupsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) load()
    else setLoading(false)
  }, [user])

  async function load() {
    setLoading(true)
    try {
      const data = await getUserGroups(user!.id)
      setGroups(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createGroup(name, desc, user!.id, groupType)
      setModal(null)
      setName('')
      setDesc('')
      setGroupType('all')
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
  }

  async function saveEditGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGroup) return
    setEditSaving(true)
    try {
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
    <div className="min-h-svh bg-[#fafaf8] pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#fafaf8]/90 backdrop-blur-md z-10 px-5 pt-14 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Your groups</h1>
        <p className="text-sm text-gray-400 mt-0.5">Places you actually trust</p>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
          </div>
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
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-lg shrink-0">
                    {GROUP_TYPES.find(t => t.value === group.type)?.emoji ?? '✨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base">{group.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {GROUP_TYPES.find(t => t.value === group.type)?.label ?? 'Mixed'}
                      {group.description ? ` · ${group.description}` : ''}
                    </p>
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
                  <input
                    type="text"
                    placeholder="Group name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 bg-gray-50 placeholder:text-gray-300"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={desc}
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
