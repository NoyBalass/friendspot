export type Category = 'restaurant' | 'bar' | 'coffee' | 'other'

export interface User {
  id: string
  email: string
  nickname: string
  avatar_url?: string
  created_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  invite_code: string
  created_by: string
  created_at: string
  member_count?: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  user?: User
}

export interface Place {
  id: string
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
  created_at: string
  avg_rating?: number
  review_count?: number
  cover_photo?: string
  added_by_user?: User
}

export interface Review {
  id: string
  place_id: string
  user_id: string
  rating: number
  text?: string
  created_at: string
  user?: User
  photos?: ReviewPhoto[]
}

export interface ReviewPhoto {
  id: string
  review_id: string
  photo_url: string
  created_at: string
}
