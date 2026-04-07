import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './lib/supabase'
import { getProfile } from './lib/auth'
import { joinGroupByCode } from './lib/groups'
import { useAuthStore } from './store/useAuthStore'
import { OnboardingPage } from './pages/OnboardingPage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupFeedPage } from './pages/GroupFeedPage'
import { PlaceDetailPage } from './pages/PlaceDetailPage'
import { AddPlacePage } from './pages/AddPlacePage'
import { ProfilePage } from './pages/ProfilePage'
import { JoinPage } from './pages/JoinPage'
import { AdminBackfillPage } from './pages/AdminBackfillPage'
import { TopBar } from './components/TopBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PwaInstallBanner } from './components/PwaInstallBanner'
import { registerServiceWorker } from './lib/notifications'
import { useLangStore, applyDir } from './lib/i18n'

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' } }}
    >
      {children}
    </motion.div>
  )
}

function AppRoutes() {
  const { session } = useAuthStore()
  const location = useLocation()

  if (!session) return <OnboardingPage />
  return (
    <>
      <TopBar />
      <div className="pt-14">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AnimatedPage><GroupsPage /></AnimatedPage>} />
            <Route path="/group/:groupId" element={<AnimatedPage><GroupFeedPage /></AnimatedPage>} />
            <Route path="/group/:groupId/place/:placeId" element={<AnimatedPage><PlaceDetailPage /></AnimatedPage>} />
            <Route path="/group/:groupId/add" element={<AnimatedPage><AddPlacePage /></AnimatedPage>} />
            <Route path="/profile" element={<AnimatedPage><ProfilePage /></AnimatedPage>} />
            <Route path="/join/:code" element={<AnimatedPage><JoinPage /></AnimatedPage>} />
            <Route path="/admin/backfill" element={<AnimatedPage><AdminBackfillPage /></AnimatedPage>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </div>
      <PwaInstallBanner />
    </>
  )
}

async function loadUserProfile(userId: string, email: string, nickname?: string) {
  try {
    return await getProfile(userId)
  } catch {
    const { data } = await supabase
      .from('users')
      .upsert({ id: userId, email, nickname: nickname ?? email.split('@')[0] }, { onConflict: 'id' })
      .select()
      .single()
    return data
  }
}

async function processPendingInvite(userId: string) {
  const pendingInvite = sessionStorage.getItem('pendingInvite')
  if (pendingInvite) {
    sessionStorage.removeItem('pendingInvite')
    try { await joinGroupByCode(pendingInvite, userId) } catch {}
  }
}

export default function App() {
  const { setUser, setSession } = useAuthStore()
  const { lang } = useLangStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => { applyDir(lang) }, [lang])

  useEffect(() => {
    registerServiceWorker()

    // Timeout fallback so loading never hangs on network issues
    const timeout = setTimeout(() => setLoading(false), 6000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
      if (session?.user) {
        try {
          const profile = await loadUserProfile(
            session.user.id,
            session.user.email ?? '',
            session.user.user_metadata?.nickname
          )
          setUser(profile)
          await processPendingInvite(session.user.id)
        } catch {}
      }
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) {
        const profile = await loadUserProfile(
          session.user.id,
          session.user.email ?? '',
          session.user.user_metadata?.nickname
        )
        setUser(profile)
        if (event === 'SIGNED_IN') {
          await processPendingInvite(session.user.id)
        }
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-svh">
        <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
