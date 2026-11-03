import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Cake,
  Camera,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { ErrorBox } from '../components/Feedback'
import { ProfileExtrasForm } from '../components/ProfileExtrasForm'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { backend } from '../lib/api'
import { formatBirthday } from '../lib/birthday'
import { prepareAvatar } from '../lib/avatar'
import { PASSWORD_LIMITS, PROFILE_LIMITS, validatePassword, validateProfile } from '../lib/profile'
import { joinName, splitName, validateFullName } from '../lib/name'

export function StudentProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState(profile?.contact_email ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [surname, setSurname] = useState(() => splitName(profile?.full_name ?? '').surname)
  const [firstName, setFirstName] = useState(() => splitName(profile?.full_name ?? '').name)
  const [patronymic, setPatronymic] = useState(() => splitName(profile?.full_name ?? '').patronymic)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!profile) {
    return (
      <AppShell role="student">
        <ErrorBox>Профиль не найден. Войдите в дневник заново.</ErrorBox>
      </AppShell>
    )
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const input = {
      contact_email: email.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
    }
    const message = validateProfile(input)
    if (message) {
      setFormError(message)
      return
    }
    setSaving(true)
    try {
      const value = await backend.profiles.updateMine(input)
      setEmail(value.contact_email ?? '')
      setPhone(value.phone ?? '')
      setBio(value.bio ?? '')
      await refreshProfile()
      toast.success('Профиль сохранён')
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const saveFullName = async (event: FormEvent) => {
    event.preventDefault()
    setNameError('')
    const value = joinName({ surname, name: firstName, patronymic })
    const message = validateFullName(value)
    if (message) {
      setNameError(message)
      return
    }
    setNameSaving(true)
    try {
      const updated = await backend.profiles.updateFullName(value)
      const parts = splitName(updated.full_name)
      setSurname(parts.surname)
      setFirstName(parts.name)
      setPatronymic(parts.patronymic)
      await refreshProfile()
      toast.success('ФИО обновлено')
    } catch (err) {
      setNameError((err as Error).message)
    } finally {
      setNameSaving(false)
    }
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError('')
    if (!currentPassword) {
      setPasswordError('Введите текущий пароль')
      return
    }
    const message = validatePassword(newPassword)
    if (message) {
      setPasswordError(message)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Новые пароли не совпадают')
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('Новый пароль должен отличаться от текущего')
      return
    }

    setPasswordSaving(true)
    try {
      await backend.auth.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Пароль изменён')
    } catch (err) {
      setPasswordError((err as Error).message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    try {
      const prepared = await prepareAvatar(file)
      await backend.profiles.uploadAvatar(prepared)
      await refreshProfile()
      toast.success('Аватар обновлён')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAvatarBusy(false)
    }
  }

  const removeAvatar = async () => {
    if (!profile.avatar_url) return
    setAvatarBusy(true)
    try {
      await backend.profiles.removeAvatar()
      await refreshProfile()
      toast.success('Аватар удалён')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <AppShell role="student">
      <div className="page-head">
        <div>
          <span className="eyebrow">Дневник студента</span>
          <h1>Мой профиль</h1>
          <p>Настройте фото, контакты и описание для своего профиля.</p>
        </div>
        <div className="page-head__actions">
          <Link to="/journal" className="btn btn--ghost btn--sm">
            <ArrowLeft size={16} /> Назад
          </Link>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-card">
          <Avatar profile={profile} size="xl" />
          <h2>{profile.full_name}</h2>
          <span className="badge badge--blue">
            <UserRound size={13} /> Студент
          </span>
          {profile.group_name ? (
            <span className="badge badge--green">группа {profile.group_name}</span>
          ) : null}

          <div className="profile-card__avatar-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseAvatar}
              hidden
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
            >
              {avatarBusy ? <Loader2 className="spin" size={15} /> : <Camera size={15} />}
              Сменить фото
            </button>
            {profile.avatar_url ? (
              <button
                type="button"
                className="text-btn text-btn--danger"
                onClick={removeAvatar}
                disabled={avatarBusy}
              >
                <Trash2 size={13} /> Удалить
              </button>
            ) : null}
          </div>

          <dl className="profile-contacts">
            {profile.login ? (
              <div>
                <dt>
                  <KeyRound size={14} /> Логин
                </dt>
                <dd>
                  <code className="profile-login">{profile.login}</code>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>
                <Cake size={14} /> День рождения
              </dt>
              <dd>
                {formatBirthday(profile.birthday_md) ?? <span className="muted">Не указан</span>}
              </dd>
            </div>
            <div>
              <dt>
                <Mail size={14} /> Почта
              </dt>
              <dd>
                {profile.contact_email ? (
                  <a href={`mailto:${profile.contact_email}`}>{profile.contact_email}</a>
                ) : (
                  <span className="muted">Не указана</span>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <Phone size={14} /> Телефон
              </dt>
              <dd>
                {profile.phone ? (
                  <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`}>{profile.phone}</a>
                ) : (
                  <span className="muted">Не указан</span>
                )}
              </dd>
            </div>
          </dl>
        </aside>

        <section className="profile-panel">
          <form className="profile-form" onSubmit={saveFullName}>
            <div>
              <span className="eyebrow">Личные данные</span>
              <h2>ФИО</h2>
              <p className="muted">
                Фамилия, имя и отчество отображаются в журнале. Если данные указаны неверно —
                исправьте их здесь, аккаунт пересоздавать не нужно.
              </p>
            </div>

            <div className="form-row form-row--two">
              <label className="field">
                <span>Фамилия</span>
                <input
                  value={surname}
                  onChange={(event) => setSurname(event.target.value)}
                  placeholder="Иванов"
                  maxLength={60}
                  required
                />
              </label>
              <label className="field">
                <span>Имя</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Иван"
                  maxLength={60}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Отчество</span>
              <input
                value={patronymic}
                onChange={(event) => setPatronymic(event.target.value)}
                placeholder="Иванович"
                maxLength={60}
              />
              <small className="field__hint">Необязательно, но отображается в журнале отдельной строкой.</small>
            </label>

            {nameError ? <ErrorBox>{nameError}</ErrorBox> : null}

            <div className="profile-form__actions">
              <button type="submit" className="btn btn--primary" disabled={nameSaving}>
                {nameSaving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                Сохранить ФИО
              </button>
            </div>
          </form>

          <form className="profile-form" onSubmit={save}>
            <div>
              <span className="eyebrow">Личные данные</span>
              <h2>Контактные данные</h2>
              <p className="muted">
                Почта и телефон необязательны. Эти данные сохраняются в вашем профиле.
              </p>
            </div>

            <div className="form-row form-row--two">
              <label className="field">
                <span>Почта</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@example.com"
                  maxLength={PROFILE_LIMITS.email}
                />
              </label>
              <label className="field">
                <span>Телефон</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7 900 000-00-00"
                  maxLength={PROFILE_LIMITS.phone}
                />
              </label>
            </div>

            <label className="field">
              <span>Описание</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Например: староста группы, отвечаю за расписание и материалы."
                maxLength={PROFILE_LIMITS.bio}
                rows={6}
              />
              <small className="field__counter">
                {bio.length} / {PROFILE_LIMITS.bio}
              </small>
            </label>

            {formError ? <ErrorBox>{formError}</ErrorBox> : null}

            <div className="profile-form__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                Сохранить профиль
              </button>
            </div>
          </form>

          <ProfileExtrasForm profile={profile} />

          <form className="profile-form profile-form--password" onSubmit={changePassword}>
            <div>
              <span className="eyebrow">Безопасность</span>
              <h2>Смена пароля</h2>
              <p className="muted">
                Введите текущий пароль и новый пароль. Минимум {PASSWORD_LIMITS.min} символов.
              </p>
            </div>

            <label className="field">
              <span>Текущий пароль</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                maxLength={PASSWORD_LIMITS.max}
                required
              />
            </label>

            <div className="form-row form-row--two">
              <label className="field">
                <span>Новый пароль</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={PASSWORD_LIMITS.min}
                  maxLength={PASSWORD_LIMITS.max}
                  required
                />
              </label>
              <label className="field">
                <span>Повторите новый пароль</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={PASSWORD_LIMITS.min}
                  maxLength={PASSWORD_LIMITS.max}
                  required
                />
              </label>
            </div>

            {passwordError ? <ErrorBox>{passwordError}</ErrorBox> : null}

            <div className="profile-form__actions">
              <button type="submit" className="btn btn--primary" disabled={passwordSaving}>
                {passwordSaving ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <KeyRound size={16} />
                )}
                Изменить пароль
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  )
}
