import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, UserRound, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { ErrorBox, Spinner } from '../components/Feedback'
import { useAuth } from '../context/AuthContext'
import { backend } from '../lib/api'
import { formatDate } from '../lib/format'
import { splitName } from '../lib/name'
import type { Profile } from '../lib/types'

export function StudentPublicProfilePage() {
  const { studentId } = useParams()
  const { profile } = useAuth()
  const [student, setStudent] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      setError('Студент не найден')
      return
    }
    let mounted = true
    setLoading(true)
    setError('')
    backend.profiles
      .getStudent(studentId)
      .then((value) => {
        if (!mounted) return
        if (!value) {
          setError('Студент не найден или профиль недоступен')
          setStudent(null)
          return
        }
        setStudent(value)
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [studentId])

  const backTo = profile?.role === 'admin' ? '/admin/groups' : '/journal'
  const isSelf = Boolean(profile && student && profile.id === student.id)
  const parts = splitName(student?.full_name ?? '')

  return (
    <AppShell role={profile?.role ?? 'student'}>
      <div className="page-head">
        <div>
          <span className="eyebrow">Профиль студента</span>
          <h1>{student?.full_name || 'Студент'}</h1>
          {student?.group_name ? <p>Группа {student.group_name}</p> : null}
        </div>
        <div className="page-head__actions">
          <Link to={backTo} className="btn btn--ghost btn--sm">
            <ArrowLeft size={16} /> Назад
          </Link>
        </div>
      </div>

      {loading ? (
        <Spinner label="Загружаем профиль…" />
      ) : error || !student ? (
        <ErrorBox>{error || 'Студент не найден'}</ErrorBox>
      ) : (
        <div className="profile-layout">
          <aside className="profile-card">
            <Avatar profile={student} size="xl" />
            <h2>{student.full_name}</h2>
            <span className="badge badge--blue">
              <UserRound size={13} /> Студент
            </span>
            {student.group_name ? (
              <span className="badge badge--green">
                <Users size={13} /> группа {student.group_name}
              </span>
            ) : null}
            {isSelf ? (
              <Link to="/profile" className="btn btn--ghost btn--sm">
                Редактировать профиль
              </Link>
            ) : null}
          </aside>

          <section className="profile-panel">
            <div className="profile-readonly">
              <span className="eyebrow">О студенте</span>
              <h2>{[parts.surname, parts.name].filter(Boolean).join(' ')}</h2>
              {parts.patronymic ? <p className="muted">{parts.patronymic}</p> : null}
              <p className={student.bio ? '' : 'muted'}>
                {student.bio || 'Студент пока не добавил описание.'}
              </p>
              <div className="profile-readonly__contacts">
                <span>
                  <Mail size={15} />
                  {student.contact_email ? (
                    <a href={`mailto:${student.contact_email}`}>{student.contact_email}</a>
                  ) : (
                    'Почта не указана'
                  )}
                </span>
                <span>
                  <Phone size={15} />
                  {student.phone ? (
                    <a href={`tel:${student.phone.replace(/[^+\d]/g, '')}`}>{student.phone}</a>
                  ) : (
                    'Телефон не указан'
                  )}
                </span>
              </div>
              <p className="muted">В дневнике с {formatDate(student.created_at)}</p>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
