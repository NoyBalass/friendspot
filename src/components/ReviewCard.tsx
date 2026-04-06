import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Check, Trash2, MessageCircle } from 'lucide-react'
import type { Review } from '../types'
import { StarRating } from './StarRating'
import { Avatar } from './Avatar'
import { uploadReviewPhoto, deleteReview } from '../lib/places'
import { getCommentCounts } from '../lib/comments'
import { CommentsSheet } from './CommentsSheet'

interface Props {
  review: Review
  placeId: string
  index?: number
  currentUserId?: string
  onPhotoAdded?: () => void
  onDeleted?: () => void
}

export function ReviewCard({ review, placeId, index = 0, currentUserId, onPhotoAdded, onDeleted }: Props) {
  const user = review.user
  const isOwner = currentUserId && (review.user_id === currentUserId || review.user?.id === currentUserId)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [replyCount, setReplyCount] = useState(0)
  const [showReplies, setShowReplies] = useState(false)

  useEffect(() => {
    getCommentCounts('review', [review.id]).then(c => setReplyCount(c[review.id] ?? 0))
  }, [review.id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteReview(review.id)
      onDeleted?.()
    } catch (err: any) {
      alert(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setUploading(true)
    try {
      await Promise.all(Array.from(e.target.files).map((f) => uploadReviewPhoto(review.id, f)))
      setDone(true)
      setTimeout(() => setDone(false), 2000)
      onPhotoAdded?.()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-white rounded-2xl p-4 border border-gray-100"
      >
        <div className="flex items-center gap-2.5 mb-3">
          {user && <Avatar nickname={user.nickname} src={user.avatar_url} size={32} />}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800">{user?.nickname ?? 'Unknown'}</p>
            <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} readonly size="sm" />
            {isOwner && (
              <button onClick={() => setConfirmDelete(true)} className="text-gray-200 hover:text-red-400 transition-colors ml-1">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="bg-red-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-red-500 font-medium">Delete this review?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
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

        {review.text && (
          <p dir="auto" className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
        )}

        {review.photos && review.photos.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {review.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.photo_url}
                alt="review photo"
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            ))}
          </div>
        )}

        {/* Footer: add photo + reply */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <label className={`flex items-center gap-1.5 text-xs cursor-pointer transition-colors ${done ? 'text-emerald-500' : 'text-gray-300 hover:text-violet-400'}`}>
            {uploading ? (
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <motion.span key={i} className="w-1 h-1 rounded-full bg-violet-400 inline-block"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} />
                ))}
              </span>
            ) : done ? (
              <><Check size={12} /> Added!</>
            ) : (
              <><Camera size={12} /> Add photo</>
            )}
            <input type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />
          </label>

          <button
            onClick={() => setShowReplies(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors"
          >
            <MessageCircle size={13} />
            <span>{replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}</span>
          </button>
        </div>
      </motion.div>

      <CommentsSheet
        open={showReplies}
        onClose={() => {
          setShowReplies(false)
          getCommentCounts('review', [review.id]).then(c => setReplyCount(c[review.id] ?? 0))
        }}
        placeId={placeId}
        targetType="review"
        targetId={review.id}
        title={`${user?.nickname ?? 'Review'}'s review`}
      />
    </>
  )
}
