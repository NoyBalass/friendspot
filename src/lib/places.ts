import { supabase } from './supabase'
import { cacheGet, cacheSet, cacheInvalidate } from './cache'
import type { Category } from '../types'

export async function getGroupPlaces(groupId: string, category?: Category, search?: string) {
  const key = `places:${groupId}:${category ?? ''}:${search ?? ''}`
  const cached = cacheGet<any[]>(key)
  if (cached) {
    // return cache immediately, refresh in background
    fetchAndCachePlaces(key, groupId, category, search)
    return cached
  }
  return fetchAndCachePlaces(key, groupId, category, search)
}

async function fetchAndCachePlaces(key: string, groupId: string, category?: Category, search?: string) {
  let query = supabase
    .from('places')
    .select(`
      *,
      added_by_user:users!places_added_by_fkey ( id, nickname, avatar_url ),
      reviews ( rating, photos:review_photos ( photo_url ) )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) throw error

  const result = (data ?? []).map((p: any) => {
    const firstPhoto = p.reviews?.flatMap((r: any) => r.photos ?? []).find((ph: any) => ph.photo_url)
    return {
      ...p,
      avg_rating: p.reviews?.length
        ? p.reviews.reduce((s: number, r: any) => s + r.rating, 0) / p.reviews.length
        : null,
      review_count: p.reviews?.length ?? 0,
      cover_photo: p.cover_photo ?? firstPhoto?.photo_url ?? null,
    }
  })

  cacheSet(key, result)
  return result
}

export async function getPlaceById(placeId: string) {
  const key = `place:${placeId}`
  const cached = cacheGet<any>(key)
  if (cached) {
    fetchAndCachePlace(key, placeId) // background refresh
    return cached
  }
  return fetchAndCachePlace(key, placeId)
}

async function fetchAndCachePlace(key: string, placeId: string) {
  const { data, error } = await supabase
    .from('places')
    .select(`*, added_by_user:users!places_added_by_fkey ( id, nickname, avatar_url )`)
    .eq('id', placeId)
    .single()
  if (error) throw error
  cacheSet(key, data)
  return data
}

export async function getPlaceReviews(placeId: string) {
  const key = `reviews:${placeId}`
  const cached = cacheGet<any[]>(key)
  if (cached) {
    fetchAndCacheReviews(key, placeId)
    return cached
  }
  return fetchAndCacheReviews(key, placeId)
}

async function fetchAndCacheReviews(key: string, placeId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id, place_id, user_id, rating, text, created_at,
      user:users ( id, nickname, avatar_url ),
      photos:review_photos ( id, photo_url )
    `)
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const result = data ?? []
  cacheSet(key, result)
  return result
}

export async function createPlace(payload: {
  group_id: string
  name: string
  category: Category
  cuisine?: string
  address?: string
  google_maps_url?: string
  instagram_url?: string
  wolt_url?: string
  tabit_url?: string
  website_url?: string
  added_by: string
}) {
  const { data, error } = await supabase.from('places').insert(payload).select().single()
  if (error) throw error
  cacheInvalidate(`places:${payload.group_id}`)
  return data
}

export async function upsertReview(payload: {
  place_id: string
  user_id: string
  rating: number
  text?: string
}) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(payload, { onConflict: 'place_id,user_id' })
    .select()
    .single()
  if (error) throw error
  cacheInvalidate(`reviews:${payload.place_id}`)
  cacheInvalidate(`places:`)
  return data
}

export async function createReview(payload: {
  place_id: string
  user_id: string
  rating: number
  text?: string
}) {
  return upsertReview(payload)
}

export async function uploadReviewPhoto(reviewId: string, file: File) {
  const ext = file.name.split('.').pop()
  const path = `reviews/${reviewId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

  const { error } = await supabase.from('review_photos').insert({ review_id: reviewId, photo_url: publicUrl })
  if (error) throw error

  cacheInvalidate(`reviews:`)
  cacheInvalidate(`places:`)
  return publicUrl
}

export async function updatePlace(placeId: string, payload: {
  name?: string
  cuisine?: string
  google_maps_url?: string
  instagram_url?: string
  wolt_url?: string
  tabit_url?: string
  website_url?: string
}) {
  const { data, error } = await supabase.from('places').update(payload).eq('id', placeId).select().single()
  if (error) throw error
  cacheInvalidate(`place:${placeId}`)
  cacheInvalidate(`places:`)
  return data
}

export async function deletePlace(placeId: string) {
  const { error } = await supabase.from('places').delete().eq('id', placeId)
  if (error) throw error
  cacheInvalidate(`place:${placeId}`)
  cacheInvalidate(`places:`)
}

export async function deleteReview(reviewId: string) {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
  if (error) throw error
  cacheInvalidate(`reviews:`)
  cacheInvalidate(`places:`)
}

export async function getUserReviewForPlace(placeId: string, userId: string) {
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, text')
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .single()
  return data
}
