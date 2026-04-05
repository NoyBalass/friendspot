import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { Place } from '../types'
import { StarRating } from './StarRating'
import { CategoryBadge } from './CategoryBadge'
import { Avatar } from './Avatar'
import { MessageCircle } from 'lucide-react'
import { deletePlace } from '../lib/places'

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
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Cover photo */}
      <div
        className="h-44 bg-gray-50 overflow-hidden relative cursor-pointer"
        onClick={() => navigate(`/group/${groupId}/place/${place.id}`)}
      >
        {place.cover_photo ? (
          <img src={place.cover_photo} alt={place.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
            {place.category === 'bar' ? '🍸' : place.category === 'restaurant' ? '🍽' : '☕'}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <CategoryBadge category={place.category} small />
        </div>
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        {/* Reviewer avatars */}
        {place.review_users && place.review_users.length > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center">
            {place.review_users.map((u, i) => (
              <div
                key={u.id}
                className="rounded-full border-2 border-white shadow-sm"
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: place.review_users!.length - i }}
              >
                <Avatar nickname={u.nickname} src={u.avatar_url} size={24} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-50 px-4 py-2.5 flex items-center justify-between gap-3">
              <p className="text-xs text-red-500 font-medium">Delete this place?</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
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

      {/* Info */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => navigate(`/group/${groupId}/place/${place.id}`)}
      >
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{place.name}</h3>
        {place.cuisine && <p className="text-sm text-gray-400 mt-0.5">{place.cuisine}</p>}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {place.avg_rating != null ? (
              <>
                <StarRating value={place.avg_rating} readonly size="sm" />
                <span className="text-xs text-gray-400">{place.avg_rating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-xs text-gray-300">No reviews yet</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <MessageCircle size={13} />
            <span>{place.review_count}</span>
          </div>
        </div>

        {place.added_by_user && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
            <Avatar nickname={place.added_by_user.nickname} src={place.added_by_user.avatar_url} size={20} />
            <span className="text-xs text-gray-400">Added by {place.added_by_user.nickname}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
