import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Search, Shuffle, Star, MapPin, MessageCircle } from 'lucide-react'
import { getGroupById } from '../lib/groups'
import { getGroupPlaces } from '../lib/places'
import { getGroupActivity, type ActivityItem } from '../lib/activity'
import { getCommentCounts } from '../lib/comments'
import { PlaceCard } from '../components/PlaceCard'
import { Avatar } from '../components/Avatar'
import { CommentsSheet } from '../components/CommentsSheet'
import { useAuthStore } from '../store/useAuthStore'
import type { Place, Category } from '../types'

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: '✨ All' },
  { value: 'restaurant', label: '🍽 Restaurant' },
  { value: 'bar', label: '🍸 Bar' },
  { value: 'coffee', label: '☕ Coffee' },
  { value: 'bakery', label: '🥐 Bakery' },
  { value: 'dessert', label: '🍦 Dessert' },
  { value: 'nightclub', label: '🎉 Nightclub' },
  { value: 'other', label: '📍 Other' },
]

const STAR_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-amber-400', 'text-lime-500', 'text-emerald-500']

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

type CommentSheetState = { placeId: string; targetType: import('../lib/comments').CommentTargetType; targetId: string; title: string } | null

function ActivityFeed({ groupId }: { groupId: string }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [sheet, setSheet] = useState<CommentSheetState>(null)

  useEffect(() => {
    getGroupActivity(groupId)
      .then(async (data) => {
        setItems(data)
        // fetch comment counts per target type
        const placeIds = data.filter(i => i.commentTargetType === 'place').map(i => i.commentTargetId)
        const reviewIds = data.filter(i => i.commentTargetType === 'review').map(i => i.commentTargetId)
        const checkinIds = data.filter(i => i.commentTargetType === 'checkin').map(i => i.commentTargetId)
        const [pc, rc, cc] = await Promise.all([
          getCommentCounts('place', placeIds),
          getCommentCounts('review', reviewIds),
          getCommentCounts('checkin', checkinIds),
        ])
        setCounts({ ...pc, ...rc, ...cc })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  function openSheet(e: React.MouseEvent, item: ActivityItem) {
    e.stopPropagation()
    let title = ''
    if (item.type === 'place') title = `Replies · ${item.place_name}`
    else if (item.type === 'review') title = `Replies · ${item.user?.nickname}'s review`
    else title = `Replies · ${item.user?.nickname} been to ${item.place_name}`
    setSheet({ placeId: item.place_id, targetType: item.commentTargetType, targetId: item.commentTargetId, title })
  }

  function handleSheetClose() {
    // refresh counts for the closed item
    if (sheet) {
      getCommentCounts(sheet.targetType, [sheet.targetId]).then(c => setCounts(prev => ({ ...prev, ...c })))
    }
    setSheet(null)
  }

  if (loading) return (
    <div className="flex justify-center pt-16">
      <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
    </div>
  )

  if (items.length === 0) return (
    <div className="text-center pt-16 text-gray-400">
      <div className="text-4xl mb-3">🕊</div>
      <p className="text-sm">No activity yet.</p>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-3 px-5 mt-2 pb-24">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/group/${groupId}/place/${item.place_id}`)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-stretch">
              {/* Thumbnail */}
              <div className="w-20 shrink-0 bg-violet-50 relative overflow-hidden">
                {item.cover_photo ? (
                  <img src={item.cover_photo} alt={item.place_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin size={20} className="text-violet-200" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 px-3 py-3 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar nickname={item.user?.nickname} src={item.user?.avatar_url} size={18} />
                  <span className="text-xs font-medium text-gray-700 truncate">{item.user?.nickname}</span>
                  <span className="text-xs text-gray-300 ml-auto shrink-0">{timeAgo(item.created_at)}</span>
                </div>

                {item.type === 'place' && (
                  <>
                    <p className="text-xs text-violet-400 font-medium mb-0.5">📍 Added a new place</p>
                    <p dir="auto" className="text-sm font-semibold text-gray-900 truncate">{item.place_name}</p>
                  </>
                )}
                {item.type === 'review' && (
                  <>
                    <div className="flex items-center gap-1 mb-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11} className={s <= item.rating ? `${STAR_COLORS[item.rating]} fill-current` : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    <p dir="auto" className="text-sm font-semibold text-gray-900 truncate">{item.place_name}</p>
                    {item.text && <p dir="auto" className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.text}</p>}
                  </>
                )}
                {item.type === 'checkin' && (
                  <>
                    <p className="text-xs text-emerald-500 font-medium mb-0.5">✅ Been there</p>
                    <p dir="auto" className="text-sm font-semibold text-gray-900 truncate">{item.place_name}</p>
                  </>
                )}

                {/* Reply button */}
                <button
                  onClick={(e) => openSheet(e, item)}
                  className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-violet-500 transition-colors"
                >
                  <MessageCircle size={12} />
                  <span>{counts[item.commentTargetId] ? `${counts[item.commentTargetId]} ${counts[item.commentTargetId] === 1 ? 'reply' : 'replies'}` : 'Reply'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {sheet && (
        <CommentsSheet
          open
          onClose={handleSheetClose}
          placeId={sheet.placeId}
          targetType={sheet.targetType}
          targetId={sheet.targetId}
          title={sheet.title}
        />
      )}
    </>
  )
}

export function GroupFeedPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [group, setGroup] = useState<any>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'places' | 'activity'>('places')
  const [pickedPlace, setPickedPlace] = useState<Place | null>(null)

  useEffect(() => {
    if (groupId) {
      loadGroup()
      loadPlaces(places.length === 0)
    }
  }, [groupId])

  useEffect(() => { loadPlaces(true) }, [category])
  useEffect(() => { loadPlaces(false) }, [search])

  async function loadGroup() {
    try { const data = await getGroupById(groupId!); setGroup(data) } catch {}
  }

  async function loadPlaces(showSpinner = false) {
    if (showSpinner) { setLoading(true); setLoadError(false) }
    try {
      const data = await Promise.race([
        getGroupPlaces(groupId!, category === 'all' ? undefined : category, search || undefined),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
      ])
      setPlaces(data)
    } catch {
      if (showSpinner) setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  function pickRandom() {
    if (!places.length) return
    const pick = places[Math.floor(Math.random() * places.length)]
    setPickedPlace(pick)
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] pb-10">
      {/* Header */}
      <div className="sticky top-14 bg-[#fafaf8]/90 backdrop-blur-md z-10 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft size={22} />
          </button>
          {group?.cover_photo && (
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <img src={group.cover_photo} alt={group.name} className="w-full h-full object-cover" />
            </div>
          )}
          <h1 dir="auto" className="flex-1 text-xl font-semibold text-gray-900 truncate min-w-0">{group?.name ?? '...'}</h1>
          {tab === 'places' && places.length > 0 && (
            <button
              onClick={pickRandom}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-colors shrink-0"
              title="Pick a random place"
            >
              <Shuffle size={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
          {(['places', 'activity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all capitalize ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              {t === 'places' ? `📍 Places${places.length ? ` (${places.length})` : ''}` : '⚡ Activity'}
            </button>
          ))}
        </div>

        {/* Search + categories — only on places tab */}
        {tab === 'places' && (
          <>
            <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
              <Search size={15} className="text-gray-300 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search places..."
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-300"
              />
            </form>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                    category === cat.value
                      ? 'bg-violet-500 border-violet-500 text-white'
                      : 'bg-white border-gray-100 text-gray-500'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tab content */}
      {tab === 'activity' ? (
        <ActivityFeed groupId={groupId!} />
      ) : (
        <div className="px-5 mt-2">
          {loading ? (
            <div className="flex justify-center pt-16">
              <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
            </div>
          ) : loadError ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-16 text-gray-400">
              <p className="text-sm mb-3">Failed to load places.</p>
              <button onClick={() => loadPlaces(true)} className="text-xs text-violet-500 font-medium hover:text-violet-700">Retry</button>
            </motion.div>
          ) : places.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-16 text-gray-400">
              <div className="text-4xl mb-3">🗺</div>
              <p className="text-sm">No places yet. Be the first to add one!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} groupId={groupId!} currentUserId={user?.id} onDeleted={() => loadPlaces(false)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate(`/group/${groupId}/add`)}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-violet-500 text-white shadow-lg shadow-violet-200 flex items-center justify-center hover:bg-violet-600 transition-colors z-40"
      >
        <Plus size={24} />
      </motion.button>

      {/* Pick me a place modal */}
      <AnimatePresence>
        {pickedPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 pb-10"
            onClick={() => setPickedPlace(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl"
            >
              {pickedPlace.cover_photo && (
                <div className="h-48 overflow-hidden">
                  <img src={pickedPlace.cover_photo} alt={pickedPlace.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5">
                <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1">Tonight's pick 🎲</p>
                <h2 dir="auto" className="text-2xl font-bold text-gray-900 mb-1">{pickedPlace.name}</h2>
                {pickedPlace.cuisine && <p dir="auto" className="text-sm text-gray-400 mb-3">{pickedPlace.cuisine}</p>}
                {pickedPlace.avg_rating != null && (
                  <div className="flex items-center gap-1.5 mb-4">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= Math.round(pickedPlace.avg_rating!) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span className="text-sm text-gray-500">{pickedPlace.avg_rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/group/${groupId}/place/${pickedPlace.id}`)}
                    className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors"
                  >
                    View place
                  </button>
                  <button
                    onClick={pickRandom}
                    className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-colors"
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
