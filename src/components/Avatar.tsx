import { useEffect, useState } from 'react'
import { frameToCss } from '../lib/profile'
import type { Profile } from '../lib/types'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function Avatar({
  profile,
  size = 'md',
  className = '',
}: {
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'avatar_frame'>
  size?: AvatarSize
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [profile.avatar_url])

  const classes = `avatar avatar--${size} ${className}`.trim()

  const content =
    profile.avatar_url && !failed ? (
      <img
        className={`${classes} avatar--image`}
        src={profile.avatar_url}
        alt={`Аватар: ${profile.full_name}`}
        onError={() => setFailed(true)}
      />
    ) : (
      <span className={classes} aria-hidden="true">
        {initials(profile.full_name)}
      </span>
    )

  // Рамка — кольцо вокруг аватара: сплошной цвет или градиент
  // (см. src/lib/profile.ts, поле profiles.avatar_frame).
  const frame = frameToCss(profile.avatar_frame)
  if (!frame) return content

  return (
    <span className={`avatar-frame avatar-frame--${size}`} style={{ background: frame }}>
      {content}
    </span>
  )
}
