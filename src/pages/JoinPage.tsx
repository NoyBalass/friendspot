import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { getGroupByInviteCode, joinGroupByCode } from '../lib/groups'
import { useAuthStore } from '../store/useAuthStore'

export function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    if (code) lookupGroup()
  }, [code])

  async function lookupGroup() {
    try {
      const data = await getGroupByInviteCode(code!)
      setGroup(data)
    } catch {
      // invalid code
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!user) {
      // Store code and redirect to auth
      sessionStorage.setItem('pendingInvite', code!)
      navigate('/')
      return
    }
    setJoining(true)
    try {
      await joinGroupByCode(code!, user.id)
      navigate(`/group/${group.id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-svh">
        <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        {group ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-5">
              <Users size={28} className="text-violet-400" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">You're invited!</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Join <span className="font-semibold text-gray-700">{group.name}</span> to see their recommendations
            </p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-8 w-full py-3.5 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {joining ? '...' : 'Join group'}
            </button>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">🤔</div>
            <h1 className="text-xl font-semibold text-gray-900">Invalid link</h1>
            <p className="text-gray-400 mt-2 text-sm">This invite link doesn't seem to be valid.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-8 w-full py-3.5 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 active:scale-95 transition-all"
            >
              Go home
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
