import { KeyRound, Palette, UserRound } from 'lucide-react'

export type ProfileSection = 'main' | 'appearance' | 'other'

const SECTIONS: Array<{
  value: ProfileSection
  label: string
  Icon: typeof UserRound
}> = [
  { value: 'main', label: 'Основная информация', Icon: UserRound },
  { value: 'appearance', label: 'Оформление', Icon: Palette },
  { value: 'other', label: 'Прочее', Icon: KeyRound },
]

/** Вкладки настроек собственного профиля. */
export function ProfileSectionTabs({
  value,
  onChange,
}: {
  value: ProfileSection
  onChange: (value: ProfileSection) => void
}) {
  return (
    <div className="profile-tabs" role="tablist" aria-label="Настройки профиля">
      {SECTIONS.map(({ value: section, label, Icon }) => (
        <button
          key={section}
          type="button"
          role="tab"
          className="profile-tab"
          aria-selected={value === section}
          onClick={() => onChange(section)}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
