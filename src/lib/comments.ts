import { supabase } from './supabase'

export type CommentTargetType = 'place' | 'review' | 'checkin'

export interface Comment {
  id: string
  user_id: string
  place_id: string
  target_type: CommentTargetType
  target_id: string
  text: string
  created_at: string
  user?: { id: string; nickname: string; avatar_url?: string }
}

export async function getComments(targetType: CommentTargetType, targetId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('place_comments')
    .select('*, user:users(id, nickname, avatar_url)')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addComment(payload: {
  user_id: string
  place_id: string
  target_type: CommentTargetType
  target_id: string
  text: string
}): Promise<Comment> {
  const { data, error } = await supabase
    .from('place_comments')
    .insert(payload)
    .select('*, user:users(id, nickname, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('place_comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function getCommentCounts(
  targetType: CommentTargetType,
  targetIds: string[]
): Promise<Record<string, number>> {
  if (!targetIds.length) return {}
  const { data } = await supabase
    .from('place_comments')
    .select('target_id')
    .eq('target_type', targetType)
    .in('target_id', targetIds)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.target_id] = (counts[row.target_id] ?? 0) + 1
  }
  return counts
}
