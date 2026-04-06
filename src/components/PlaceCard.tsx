import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trash2, Star } from 'lucide-react'
import type { Place } from '../types'
import { CategoryBadge } from './CategoryBadge'
import { Avatar } from './Avatar'
import { deletePlace } from '../lib/places'

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽', bar: '🍸', coffee: '☕', bakery: '🥐',
  dessert: '🍦', nightclub: '🎉', other: '📍',
}

interface Props {
  place: Place
  groupId: string
  currentUserId?: string
  onDeleted?: () => void
}

export function PlaceCard({ place, groupId, currentUserId, onDeleted }: Props) {
  const navigate = useNavigate()
  const isOwner = currentUserId && place.added_by === currentUserId
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(true)
    try {
      await deletePlace(place.id)
      onDeleted?.()
    } catch (err: any) {
      alert(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      style={{ aspectRatio: '3/4' }}
      onClick={() => navigate(`/group/${groupId}/place/${place.id}`)}
    >
      {/* Full-bleed photo */}
      {place.cover_photo ? (
        <img
          src={place.cover_photo}
          alt={place.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
          <span className="text-5xl opacity-30">{CATEGORY_EMOJI[place.category] ?? '📍'}</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      {/* Top row */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
        <CategoryBadge category={place.category} small />
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Reviewer avatars */}
      {place.review_users && place.review_users.length > 0 && (
        <div className="absolute top-10 right-2.5 flex flex-col items-end gap-0.5">
          {place.review_users.map((u, i) => (
            <div
              key={u.id}
              className="rounded-full border-2 border-white/60 shadow-sm"
              style={{ marginTop: i === 0 ? 0 : -6, zIndex: place.review_users!.length - i }}
            >
              <Avatar nickname={u.nickname} src={u.avatar_url} size={22} />
            </div>
          ))}
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 dir="auto" className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-1">
          {place.name}
        </h3>
        {place.cuisine && (
          <p dir="auto" className="text-white/60 text-xs mb-1.5 truncate">{place.cuisine}</p>
        )}
        <div className="flex items-center justify-between">
          {place.avg_rating != null ? (
            <div className="flex items-center gap-1">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-white/90 text-xs font-medium">{place.avg_rating.toFixed(1)}</span>
              {place.review_count != null && place.review_count > 0 && (
                <span className="text-white/50 text-xs">({place.review_count})</span>
              )}
            </div>
          ) : (
            <span className="text-white/40 text-xs">No reviews</span>
          )}
          {place.added_by_user && (
            <Avatar nickname={place.added_by_user.nickname} src={place.added_by_user.avatar_url} size={20} />
          )}
        </div>
      </div>

      {/* Confirm delete overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-sm font-medium text-center">Delete this place?</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg border border-white/30"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? '...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
