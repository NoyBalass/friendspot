import { supabase } from './supabase'
import { cacheGet, cacheSet, cacheInvalidate } from './cache'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createGroup(name: string, description: string, userId: string) {
  const invite_code = generateInviteCode()
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, description, invite_code, created_by: userId })
    .select()
    .single()
  if (error) throw error

  await supabase.from('group_members').insert({ group_id: group.id, user_id: userId, role: 'admin' })
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

  await supabase.from('group_members').insert({ group_id: group.id, user_id: userId, role: 'member' })
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
    .select(`group_id, role, groups ( id, name, description, invite_code, created_by, created_at )`)
    .eq('user_id', userId)
  if (error) throw error
  const result = data?.map((m: any) => ({ ...m.groups, role: m.role })) ?? []
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

export async function getGroupByInviteCode(code: string) {
  const { data, error } = await supabase
    .from('groups').select('*').eq('invite_code', code.toUpperCase()).single()
  if (error) throw new Error('Group not found')
  return data
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`id, role, joined_at, users ( id, nickname, avatar_url )`)
    .eq('group_id', groupId)
  if (error) throw error
  return data ?? []
}
