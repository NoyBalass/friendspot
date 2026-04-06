import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestAndSubscribe(userId: string): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!('Notification' in window) || !('PushManager' in window)) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set — push notifications disabled')
    return 'error'
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription: sub.toJSON() },
      { onConflict: 'user_id' }
    )
    return 'granted'
  } catch (err) {
    console.error('Push subscribe error:', err)
    return 'error'
  }
}

export async function unsubscribe(userId: string) {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  } catch (err) {
    console.error('Push unsubscribe error:', err)
  }
}
