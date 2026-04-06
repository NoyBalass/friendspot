import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2 } from 'lucide-react'
import { getComments, addComment, deleteComment, type Comment, type CommentTargetType } from '../lib/comments'
import { Avatar } from './Avatar'
import { useAuthStore } from '../store/useAuthStore'

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(iso).toLocaleDateString()
}

interface Props {
  open: boolean
  onClose: () => void
  placeId: string
  targetType: CommentTargetType
  targetId: string
  title: string
}

export function CommentsSheet({ open, onClose, placeId, targetType, targetId, title }: Props) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      loadComments()
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setComments([])
      setText('')
    }
  }, [open, targetId])

  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length])

  async function loadComments() {
    setLoading(true)
    try {
      const data = await getComments(targetType, targetId)
      setComments(data)
    } catch {}
    setLoading(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !user) return
    setSending(true)
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      place_id: placeId,
      target_type: targetType,
      target_id: targetId,
      text: text.trim(),
      created_at: new Date().toISOString(),
      user: { id: user.id, nickname: user.nickname, avatar_url: user.avatar_url },
    }
    setComments(prev => [...prev, optimistic])
    setText('')
    try {
      const saved = await addComment({
        user_id: user.id,
        place_id: placeId,
        target_type: targetType,
        target_id: targetId,
        text: optimistic.text,
      })
      setComments(prev => prev.map(c => c.id === optimistic.id ? saved : c))
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      setText(optimistic.text)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    try { await deleteComment(commentId) } catch {
      loadComments()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '80svh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50 shrink-0">
              <div className="w-8 h-1 bg-gray-200 rounded-full absolute top-2.5 left-1/2 -translate-x-1/2" />
              <h3 dir="auto" className="text-sm font-semibold text-gray-700 mt-1 truncate max-w-[75%]">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
                <X size={18} />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {loading ? (
                <div className="flex justify-center pt-6">
                  <div className="w-5 h-5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-gray-300 pt-6">No replies yet. Be the first!</p>
              ) : (
                comments.map(comment => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 group"
                  >
                    <Avatar nickname={comment.user?.nickname ?? '?'} src={comment.user?.avatar_url} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800">{comment.user?.nickname}</span>
                          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p dir="auto" className="text-sm text-gray-700 leading-snug">{comment.text}</p>
                      </div>
                    </div>
                    {comment.user_id === user?.id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 mt-1 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 px-4 py-3 border-t border-gray-50 shrink-0"
            >
              <Avatar nickname={user?.nickname ?? '?'} src={user?.avatar_url} size={30} />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 text-sm outline-none bg-gray-50 rounded-2xl px-3 py-2 placeholder:text-gray-300"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white disabled:opacity-30 transition-opacity shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
