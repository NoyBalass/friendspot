-- =====================
-- FRIENDSPOT DATABASE SCHEMA
-- Run this in Supabase SQL editor
-- =====================

-- Users (mirrors auth.users, stores public profile)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nickname text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Groups
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  invite_code text unique not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Group members
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Places
create table public.places (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('restaurant', 'bar', 'cafe', 'coffee', 'other')),
  cuisine text,
  address text,
  google_maps_url text,
  instagram_url text,
  wolt_url text,
  tabit_url text,
  website_url text,
  cover_photo text,
  added_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Reviews
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  place_id uuid references public.places(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  text text,
  created_at timestamptz default now(),
  unique(place_id, user_id)
);

-- Review photos
create table public.review_photos (
  id uuid default gen_random_uuid() primary key,
  review_id uuid references public.reviews(id) on delete cascade not null,
  photo_url text not null,
  created_at timestamptz default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.places enable row level security;
alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;

-- Users: anyone can read profiles, only own user can update
create policy "Public profiles" on public.users for select using (true);
create policy "Insert own profile" on public.users for insert with check (auth.uid() = id);
create policy "Update own profile" on public.users for update using (auth.uid() = id);

-- Groups: members can read their groups
create policy "Read groups you belong to" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );
create policy "Create groups" on public.groups for insert with check (auth.uid() = created_by);

-- Allow reading any group by invite code (for join flow)
create policy "Read group by invite code" on public.groups
  for select using (true);

-- Group members
create policy "Read members of your groups" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );
create policy "Join groups" on public.group_members for insert with check (auth.uid() = user_id);

-- Places: group members can read and add
create policy "Read places in your groups" on public.places
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = places.group_id and user_id = auth.uid()
    )
  );
create policy "Add places to your groups" on public.places
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = places.group_id and user_id = auth.uid()
    )
    and auth.uid() = added_by
  );

-- Reviews
create policy "Read reviews in your groups" on public.reviews
  for select using (
    exists (
      select 1 from public.places p
      join public.group_members gm on gm.group_id = p.group_id
      where p.id = reviews.place_id and gm.user_id = auth.uid()
    )
  );
create policy "Add your own review" on public.reviews
  for insert with check (auth.uid() = user_id);

-- Review photos
create policy "Read review photos" on public.review_photos
  for select using (
    exists (
      select 1 from public.reviews r
      join public.places p on p.id = r.place_id
      join public.group_members gm on gm.group_id = p.group_id
      where r.id = review_photos.review_id and gm.user_id = auth.uid()
    )
  );
create policy "Add review photos" on public.review_photos
  for insert with check (
    exists (
      select 1 from public.reviews r
      where r.id = review_photos.review_id and r.user_id = auth.uid()
    )
  );

-- =====================
-- STORAGE BUCKET
-- Run these separately in Supabase dashboard > Storage
-- =====================
-- 1. Create a bucket called "photos" (public)
-- 2. Add policy: authenticated users can upload to "reviews/*"
-- 3. Public read access for the bucket
