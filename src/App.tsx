import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { BottomNav } from './components/BottomNav'

function AppRoutes() {
  const { session } = useAuthStore()

  if (!session) return <OnboardingPage />

  return (
    <>
      <Routes>
        <Route path="/" element={<GroupsPage />} />
        <Route path="/group/:groupId" element={<GroupFeedPage />} />
        <Route path="/group/:groupId/place/:placeId" element={<PlaceDetailPage />} />
        <Route path="/group/:groupId/add" element={<AddPlacePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default function App() {
  const { setUser, setSession } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        try {
          const profile = await getProfile(session.user.id)
          setUser(profile)

          const pendingInvite = sessionStorage.getItem('pendingInvite')
          if (pendingInvite) {
            sessionStorage.removeItem('pendingInvite')
            await joinGroupByCode(pendingInvite, session.user.id)
          }
        } catch {}
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        try {
          const profile = await getProfile(session.user.id)
          setUser(profile)
        } catch {}
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
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
