interface Props {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

export function StarRating({ value, onChange, size = 'md', readonly = false }: Props) {
  const sizes = { sm: 14, md: 20, lg: 28 }
  const px = sizes[size]

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          style={{ fontSize: px, lineHeight: 1 }}
          className={`transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <span className={star <= Math.round(value) ? 'text-amber-400' : 'text-gray-200'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}
