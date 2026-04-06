import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { resizeImage } from '../lib/imageUtils'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string
const SUPABASE_STORAGE_URL = 'supabase.co/storage/v1/object/public/photos/'

type LogLine = { text: string; type: 'info' | 'ok' | 'skip' | 'err' }

export function AdminBackfillPage() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [done, setDone] = useState(false)

  function push(text: string, type: LogLine['type'] = 'info') {
    setLog(prev => [...prev, { text, type }])
  }

  // ── 1. Fetch Google photo for places without cover ──────────────────────
  async function runGooglePhotoBackfill() {
    push('— Fetching places without cover photo…')
    const { data: places, error } = await supabase
      .from('places')
      .select('id, name, google_maps_url')
      .is('cover_photo', null)

    if (error) { push(`Error fetching places: ${error.message}`, 'err'); return }
    push(`Found ${places?.length ?? 0} places without cover photo.`)

    for (const place of places ?? []) {
      const match = place.google_maps_url?.match(/place_id:([^&\s]+)/)
      if (!match) { push(`${place.name} — no place_id, skip`, 'skip'); continue }
      const placeId = match[1]
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
          headers: { 'X-Goog-Api-Key': GOOGLE_API_KEY, 'X-Goog-FieldMask': 'photos' },
        })
        const data = await res.json()
        const photoName = data.photos?.[0]?.name
        if (!photoName) { push(`${place.name} — no photos on Google`, 'skip'); continue }

        const mediaRes = await fetch(
          `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${GOOGLE_API_KEY}`
        )
        const mediaData = await mediaRes.json()
        const url = mediaData.photoUri as string | undefined
        if (!url) { push(`${place.name} — could not get photo URI`, 'skip'); continue }

        const { error: updateErr } = await supabase
          .from('places')
          .update({ cover_photo: url })
          .eq('id', place.id)
        if (updateErr) throw updateErr

        push(`${place.name} — Google photo saved ✓`, 'ok')
      } catch (err: any) {
        push(`${place.name} — ${err.message}`, 'err')
      }
    }
    push('Google photo backfill done.')
  }

  // ── 2. Compress existing Supabase-storage cover photos ──────────────────
  async function runCompressionBackfill() {
    push('— Fetching places with Supabase-hosted cover photos…')
    const { data: places, error } = await supabase
      .from('places')
      .select('id, name, cover_photo')
      .not('cover_photo', 'is', null)

    if (error) { push(`Error fetching places: ${error.message}`, 'err'); return }

    const storagePlaces = (places ?? []).filter(p => p.cover_photo?.includes(SUPABASE_STORAGE_URL))
    push(`Found ${storagePlaces.length} places with uploaded cover photos.`)

    for (const place of storagePlaces) {
      try {
        // Extract storage path from public URL
        const pathMatch = place.cover_photo!.match(/public\/photos\/(.+)$/)
        if (!pathMatch) { push(`${place.name} — can't parse path, skip`, 'skip'); continue }
        const storagePath = pathMatch[1]

        // Download existing file
        const imgRes = await fetch(place.cover_photo!)
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
        const blob = await imgRes.blob()
        const origKB = Math.round(blob.size / 1024)

        const file = new File([blob], storagePath.split('/').pop() ?? 'photo.jpg', { type: blob.type || 'image/jpeg' })
        const compressed = await resizeImage(file, 1200, 0.82)
        const newKB = Math.round(compressed.size / 1024)

        if (newKB >= origKB * 0.95) {
          push(`${place.name} — already small (${origKB}KB), skip`, 'skip')
          continue
        }

        // Re-upload to same path
        const { error: uploadErr } = await supabase.storage
          .from('photos')
          .upload(storagePath, compressed, { upsert: true, contentType: 'image/jpeg' })
        if (uploadErr) throw uploadErr

        push(`${place.name} — ${origKB}KB → ${newKB}KB ✓`, 'ok')
      } catch (err: any) {
        push(`${place.name} — ${err.message}`, 'err')
      }
    }
    push('Compression backfill done.')
  }

  // ── 3. Compress existing review photos ──────────────────────────────────
  async function runReviewPhotoCompression() {
    push('— Fetching review photos in Supabase storage…')
    const { data: photos, error } = await supabase
      .from('review_photos')
      .select('id, photo_url')

    if (error) { push(`Error fetching review photos: ${error.message}`, 'err'); return }

    const storagePhotos = (photos ?? []).filter(p => p.photo_url?.includes(SUPABASE_STORAGE_URL))
    push(`Found ${storagePhotos.length} review photos.`)

    for (const photo of storagePhotos) {
      try {
        const pathMatch = photo.photo_url.match(/public\/photos\/(.+)$/)
        if (!pathMatch) { push(`review ${photo.id} — can't parse path, skip`, 'skip'); continue }
        const storagePath = pathMatch[1]

        const imgRes = await fetch(photo.photo_url)
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
        const blob = await imgRes.blob()
        const origKB = Math.round(blob.size / 1024)

        const file = new File([blob], storagePath.split('/').pop() ?? 'photo.jpg', { type: blob.type || 'image/jpeg' })
        const compressed = await resizeImage(file, 1200, 0.82)
        const newKB = Math.round(compressed.size / 1024)

        if (newKB >= origKB * 0.95) {
          push(`review ${photo.id} — already small (${origKB}KB), skip`, 'skip')
          continue
        }

        const { error: uploadErr } = await supabase.storage
          .from('photos')
          .upload(storagePath, compressed, { upsert: true, contentType: 'image/jpeg' })
        if (uploadErr) throw uploadErr

        push(`review ${photo.id} — ${origKB}KB → ${newKB}KB ✓`, 'ok')
      } catch (err: any) {
        push(`review ${photo.id} — ${err.message}`, 'err')
      }
    }
    push('Review photo compression done.')
  }

  async function runAll() {
    setRunning(true)
    setDone(false)
    setLog([])
    try {
      await runGooglePhotoBackfill()
      await runCompressionBackfill()
      await runReviewPhotoCompression()
    } finally {
      push('═══ All done ═══', 'ok')
      setRunning(false)
      setDone(true)
    }
  }

  const colors: Record<LogLine['type'], string> = {
    info: 'text-gray-500',
    ok: 'text-emerald-600',
    skip: 'text-amber-500',
    err: 'text-red-500',
  }

  return (
    <div className="min-h-svh bg-[#fafaf8] p-5">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin: Backfill</h1>
      <p className="text-sm text-gray-400 mb-5">
        Fetches Google photos for places without a cover, and recompresses all existing uploaded photos.
      </p>

      <button
        onClick={runAll}
        disabled={running}
        className="px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-violet-600 transition-colors"
      >
        {running ? 'Running…' : done ? 'Run again' : 'Run backfill'}
      </button>

      {log.length > 0 && (
        <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-4 font-mono text-xs space-y-0.5 max-h-[60vh] overflow-y-auto">
          {log.map((line, i) => (
            <p key={i} className={colors[line.type]}>{line.text}</p>
          ))}
        </div>
      )}
    </div>
  )
}
