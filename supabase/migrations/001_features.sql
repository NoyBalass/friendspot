-- ============================================================
-- friendspots — schema additions
-- Run once against your Supabase project via the SQL editor
-- or `supabase db push`.
-- ============================================================

-- ── 1. Column additions ──────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS cover_photo text;

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS cover_photo text;

-- ── 2. place_checkins ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS place_checkins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id   uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('want', 'been')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);

ALTER TABLE place_checkins ENABLE ROW LEVEL SECURITY;

-- Users can read all check-ins for places in groups they belong to
CREATE POLICY IF NOT EXISTS "checkins_select" ON place_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN places p ON p.id = place_checkins.place_id
      WHERE gm.group_id = p.group_id
        AND gm.user_id  = auth.uid()
    )
  );

-- Users can insert/update/delete their own check-ins
CREATE POLICY IF NOT EXISTS "checkins_insert" ON place_checkins
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "checkins_update" ON place_checkins
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "checkins_delete" ON place_checkins
  FOR DELETE USING (user_id = auth.uid());

-- ── 3. place_comments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS place_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('place', 'review', 'checkin')),
  target_id   uuid NOT NULL,
  text        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE place_comments ENABLE ROW LEVEL SECURITY;

-- Group members can read comments for places in their groups
CREATE POLICY IF NOT EXISTS "comments_select" ON place_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = (SELECT group_id FROM places WHERE id = place_comments.place_id)
        AND gm.user_id  = auth.uid()
    )
  );

-- Users can insert their own comments
CREATE POLICY IF NOT EXISTS "comments_insert" ON place_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY IF NOT EXISTS "comments_delete" ON place_comments
  FOR DELETE USING (user_id = auth.uid());

-- ── 4. push_subscriptions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own subscriptions
CREATE POLICY IF NOT EXISTS "push_subs_all" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- The send-push edge function runs as service_role (bypasses RLS) — no extra policy needed.

-- ── 5. Storage bucket policies (photos) ──────────────────────
-- Assumes a bucket named "photos" already exists and is public.
-- These policies allow authenticated users to upload to their
-- own avatar path and to place/group photo paths.

-- Avatar uploads: avatars/{uid}/avatar.jpg
CREATE POLICY IF NOT EXISTS "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
