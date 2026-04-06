import { supabase } from './supabase'
import type { CommentTargetType } from './comments'

export type ActivityItem =
  | {
      type: 'place'
      id: string
      place_id: string
      place_name: string
      cover_photo: string | null
      category: string
      created_at: string
      user: { id: string; nickname: string; avatar_url?: string }
      commentTargetType: CommentTargetType
      commentTargetId: string
    }
  | {
      type: 'review'
      id: string
      review_id: string
      place_id: string
      place_name: string
      cover_photo: string | null
      rating: number
      text?: string
      created_at: string
      user: { id: string; nickname: string; avatar_url?: string }
      commentTargetType: CommentTargetType
      commentTargetId: string
    }
  | {
      type: 'checkin'
      id: string
      checkin_id: string
      place_id: string
      place_name: string
      cover_photo: string | null
      created_at: string
      user: { id: string; nickname: string; avatar_url?: string }
      commentTargetType: CommentTargetType
      commentTargetId: string
    }

export async function getGroupActivity(groupId: string): Promise<ActivityItem[]> {
  const [placesRes, reviewsRes, checkinsRes] = await Promise.all([
    supabase
      .from('places')
      .select('id, name, cover_photo, category, created_at, user:users!places_added_by_fkey(id, nickname, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('reviews')
      .select('id, rating, text, created_at, user:users(id, nickname, avatar_url), place:places!inner(id, name, cover_photo, group_id)')
      .eq('place.group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('place_checkins')
      .select('id, created_at, user:users(id, nickname, avatar_url), place:places!inner(id, name, cover_photo, group_id)')
      .eq('place.group_id', groupId)
      .eq('status', 'been')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const placeItems: ActivityItem[] = (placesRes.data ?? []).map((p: any) => ({
    type: 'place',
    id: `place-${p.id}`,
    place_id: p.id,
    place_name: p.name,
    cover_photo: p.cover_photo ?? null,
    category: p.category,
    created_at: p.created_at,
    user: p.user,
    commentTargetType: 'place' as CommentTargetType,
    commentTargetId: p.id,
  }))

  const reviewItems: ActivityItem[] = (reviewsRes.data ?? []).map((r: any) => ({
    type: 'review',
    id: `review-${r.id}`,
    review_id: r.id,
    place_id: r.place.id,
    place_name: r.place.name,
    cover_photo: r.place.cover_photo ?? null,
    rating: r.rating,
    text: r.text,
    created_at: r.created_at,
    user: r.user,
    commentTargetType: 'review' as CommentTargetType,
    commentTargetId: r.id,
  }))

  const checkinItems: ActivityItem[] = (checkinsRes.data ?? []).map((c: any) => ({
    type: 'checkin',
    id: `checkin-${c.id}`,
    checkin_id: c.id,
    place_id: c.place.id,
    place_name: c.place.name,
    cover_photo: c.place.cover_photo ?? null,
    created_at: c.created_at,
    user: c.user,
    commentTargetType: 'checkin' as CommentTargetType,
    commentTargetId: c.id,
  }))

  return [...placeItems, ...reviewItems, ...checkinItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)
}
