interface Props {
  nickname: string
  src?: string
  size?: number
}

export function Avatar({ nickname, src, size = 36 }: Props) {
  const initials = nickname.slice(0, 2).toUpperCase()
  const colors = [
    'bg-rose-100 text-rose-600',
    'bg-violet-100 text-violet-600',
    'bg-sky-100 text-sky-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
  ]
  const color = colors[nickname.charCodeAt(0) % colors.length]

  if (src) {
    return (
      <img
        src={src}
        alt={nickname}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
