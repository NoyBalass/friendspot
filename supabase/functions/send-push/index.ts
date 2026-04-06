import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore — npm: imports work in Supabase Edge Functions (Deno)
import webpush from 'npm:web-push'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

async function sendToUsers(userIds: string[], payload: object) {
  if (userIds.length === 0) return
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .in('user_id', userIds)

  await Promise.allSettled(
    (subs ?? []).map((s: any) =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload)).catch(console.error)
    ),
  )
}

Deno.serve(async (req) => {
  try {
    const { type, record, table } = await req.json()
    if (type !== 'INSERT') return new Response('ok')

    if (table === 'places') {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', record.group_id)
        .neq('user_id', record.added_by)

      const { data: adder } = await supabase
        .from('users').select('nickname').eq('id', record.added_by).single()

      await sendToUsers(
        (members ?? []).map((m: any) => m.user_id),
        {
          title: 'friendspots',
          body: `${adder?.nickname ?? 'Someone'} added "${record.name}"`,
          url: `/group/${record.group_id}`,
          tag: `place-${record.id}`,
        },
      )
    }

    if (table === 'reviews') {
      const { data: place } = await supabase
        .from('places').select('added_by, name, group_id').eq('id', record.place_id).single()

      if (place && place.added_by !== record.user_id) {
        const { data: reviewer } = await supabase
          .from('users').select('nickname').eq('id', record.user_id).single()

        await sendToUsers([place.added_by], {
          title: 'friendspots',
          body: `${reviewer?.nickname ?? 'Someone'} reviewed your place "${place.name}"`,
          url: `/group/${place.group_id}/place/${record.place_id}`,
          tag: `review-${record.id}`,
        })
      }
    }
  } catch (err) {
    console.error(err)
  }

  return new Response('ok')
})
