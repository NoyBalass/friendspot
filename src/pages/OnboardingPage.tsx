import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, signUp } from '../lib/auth'
import { Eye, EyeOff, ChevronRight } from 'lucide-react'

const SLIDES = [
  {
    emoji: '🍽',
    title: 'The place list your\nfriends actually update',
    subtitle: 'No influencers. No algorithms. Just honest picks from people whose taste you trust.',
    bg: 'from-violet-500 to-violet-700',
  },
  {
    emoji: '👥',
    title: 'Private groups,\nnot public feeds',
    subtitle: 'Create a group with your crew and share spots only with them. What happens in the group stays in the group.',
    bg: 'from-fuchsia-500 to-violet-600',
  },
  {
    emoji: '⭐',
    title: 'Real reviews from\npeople you know',
    subtitle: "Rate and review places you've actually visited. Your friends will finally know if it's worth the hype.",
    bg: 'from-amber-400 to-orange-500',
  },
  {
    emoji: '🔖',
    title: 'Plan together,\nnot alone',
    subtitle: 'Save places you want to try, mark where you\'ve been, and see who wants to go where.',
    bg: 'from-emerald-400 to-teal-600',
  },
]

function IntroSlides({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  function next() {
    if (isLast) { onDone(); return }
    setDir(1)
    setIndex(i => i + 1)
  }

  function prev() {
    if (index === 0) return
    setDir(-1)
    setIndex(i => i - 1)
  }

  return (
    <div className={`min-h-svh flex flex-col bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
      {/* Skip */}
      <div className="flex justify-end px-6 pt-12">
        <button onClick={onDone} className="text-white/60 text-sm font-medium">
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex flex-col items-center text-center"
          >
            <div className="text-8xl mb-8 drop-shadow-lg">{slide.emoji}</div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-4 whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="text-white/75 text-base leading-relaxed max-w-xs">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-12 flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDir(i > index ? 1 : -1); setIndex(i) }}
              className={`rounded-full transition-all duration-300 ${
                i === index ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="flex w-full gap-3">
          {index > 0 && (
            <button
              onClick={prev}
              className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 h-12 rounded-2xl bg-white text-violet-700 font-semibold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            {isLast ? 'Get started' : 'Next'}
            {!isLast && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, nickname)
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-svh flex flex-col items-center justify-center px-6 bg-[#fafaf8]"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-violet-600 tracking-tight mb-1">friendspots</h1>
        <p className="text-sm text-gray-400">Recommendations from people you trust</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        {/* Toggle */}
        <div className="flex bg-gray-50 rounded-2xl p-1 mb-7">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="nickname"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 transition-colors bg-gray-50 placeholder:text-gray-300"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 transition-colors bg-gray-50 placeholder:text-gray-300"
          />

          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-300 transition-colors bg-gray-50 placeholder:text-gray-300 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 text-center">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 mt-1"
          >
            {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

export function OnboardingPage() {
  const [showAuth, setShowAuth] = useState(() => !!localStorage.getItem('intro-seen'))

  function finishIntro() {
    localStorage.setItem('intro-seen', '1')
    setShowAuth(true)
  }

  return (
    <AnimatePresence mode="wait">
      {showAuth ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthForm />
        </motion.div>
      ) : (
        <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <IntroSlides onDone={finishIntro} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
