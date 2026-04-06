import { supabase } from './supabase'
import { cacheGet, cacheSet, cacheInvalidate } from './cache'
import { resizeImage } from './imageUtils'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createGroup(name: string, description: string, userId: string, type: string = 'all') {
  const invite_code = generateInviteCode()
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, description, invite_code, created_by: userId, type })
    .select()
    .single()
  if (error) throw error

  const { error: memberError } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId, role: 'admin' })
  if (memberError) throw memberError
  cacheInvalidate(`groups:${userId}`)
  return group
}

export async function joinGroupByCode(inviteCode: string, userId: string) {
  const { data: group, error } = await supabase
    .from('groups').select('*').eq('invite_code', inviteCode.toUpperCase()).single()
  if (error) throw new Error('Group not found')

  const { data: existing } = await supabase
    .from('group_members').select('id').eq('group_id', group.id).eq('user_id', userId).single()
  if (existing) return group

  const { error: memberError } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId, role: 'member' })
  if (memberError) throw memberError
  cacheInvalidate(`groups:${userId}`)
  return group
}

export async function getUserGroups(userId: string) {
  const key = `groups:${userId}`
  const cached = cacheGet<any[]>(key)
  if (cached) {
    fetchAndCacheGroups(key, userId)
    return cached
  }
  return fetchAndCacheGroups(key, userId)
}

async function fetchAndCacheGroups(key: string, userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`group_id, role, groups ( id, name, description, type, invite_code, created_by, created_at, cover_photo, group_members ( users ( id, nickname, avatar_url ) ) )`)
    .eq('user_id', userId)
  if (error) throw error
  const result = data?.map((m: any) => ({
    ...m.groups,
    role: m.role,
    members: (m.groups?.group_members ?? [])
      .map((gm: any) => gm.users)
      .filter(Boolean)
      .slice(0, 5),
  })) ?? []
  cacheSet(key, result)
  return result
}

export async function getGroupById(groupId: string) {
  const key = `group:${groupId}`
  const cached = cacheGet<any>(key)
  if (cached) return cached
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single()
  if (error) throw error
  cacheSet(key, data)
  return data
}

export async function updateGroup(groupId: string, payload: { name?: string; description?: string; type?: string }) {
  const { data, error } = await supabase.from('groups').update(payload).eq('id', groupId).select().single()
  if (error) throw error
  cacheInvalidate(`group:${groupId}`)
  cacheInvalidate(`groups:`)
  return data
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) throw error
  cacheInvalidate(`group:${groupId}`)
  cacheInvalidate(`groups:`)
}

export async function getGroupByInviteCode(code: string) {
  const { data, error } = await supabase
    .from('groups').select('*').eq('invite_code', code.toUpperCase()).single()
  if (error) throw new Error('Group not found')
  return data
}

export async function uploadGroupCoverPhoto(groupId: string, file: File) {
  const compressed = await resizeImage(file, 1200, 0.82)
  const path = `groups/${groupId}/cover.jpg`

  const { error: uploadError } = await supabase.storage.from('photos').upload(path, compressed, { upsert: true })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

  const { error } = await supabase.from('groups').update({ cover_photo: publicUrl }).eq('id', groupId)
  if (error) throw error

  cacheInvalidate(`group:${groupId}`)
  cacheInvalidate(`groups:`)
  return publicUrl
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`id, role, joined_at, users ( id, nickname, avatar_url )`)
    .eq('group_id', groupId)
  if (error) throw error
  return data ?? []
}
