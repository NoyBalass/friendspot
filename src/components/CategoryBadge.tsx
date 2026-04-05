import type { Category } from '../types'

const labels: Record<Category, string> = {
  restaurant: '🍽 Restaurant',
  bar: '🍸 Bar',
  coffee: '☕ Coffee',
  other: '📍 Other',
}

const colors: Record<Category, string> = {
  restaurant: 'bg-orange-50 text-orange-600',
  bar: 'bg-violet-50 text-violet-600',
  coffee: 'bg-amber-50 text-amber-700',
  other: 'bg-gray-50 text-gray-600',
}

interface Props {
  category: Category
  small?: boolean
}

export function CategoryBadge({ category, small = false }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors[category]} ${small ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}`}>
      {labels[category]}
    </span>
  )
}
