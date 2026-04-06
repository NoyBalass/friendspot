import { supabase } from './supabase'

export type CheckinStatus = 'want' | 'been' | null

export async function getCheckin(placeId: string, userId: string): Promise<CheckinStatus> {
  const { data } = await supabase
    .from('place_checkins')
    .select('status')
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.status as CheckinStatus) ?? null
}

export async function setCheckin(placeId: string, userId: string, status: CheckinStatus) {
  if (!status) {
    await supabase.from('place_checkins').delete().eq('place_id', placeId).eq('user_id', userId)
    return
  }
  await supabase
    .from('place_checkins')
    .upsert({ place_id: placeId, user_id: userId, status }, { onConflict: 'place_id,user_id' })
}

export async function getCheckinCounts(placeId: string): Promise<{ want: number; been: number }> {
  const { data } = await supabase
    .from('place_checkins')
    .select('status')
    .eq('place_id', placeId)
  const want = data?.filter(r => r.status === 'want').length ?? 0
  const been = data?.filter(r => r.status === 'been').length ?? 0
  return { want, been }
}
