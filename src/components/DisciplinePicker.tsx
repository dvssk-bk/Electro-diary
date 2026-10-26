import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenCheck, Layers3, Loader2, Plus, Users } from 'lucide-react'
import { useDisciplines } from '../context/DisciplineContext'
import { useToast } from '../context/ToastContext'
import { backend } from '../lib/api'
import type { Group } from '../lib/types'
import { EmptyState, ErrorBox, Spinner } from './Feedback'

export function DisciplinePicker({ role }: { role: 'student' | 'admin' }) {
  const { disciplines, loading, error, select, refresh } = useDisciplines()
  const toast = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showForm, setShowForm] = useState(role === 'admin' && disciplines.length === 0)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (role !== 'admin') return
    let mounted = true
    backend.groups
      .list()
      .then((list) => {
        if (!mounted) return
        setGroups(list)
        setGroupName((current) => current || list[0]?.name || '')
      })
      .catch((err: Error) => {
        if (mounted) setFormError(err.message)
      })
    return () => {
      mounted = false
    }
  }, [role])

  const createDiscipline = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setCreating(true)
    try {
      const created = await backend.disciplines.create({ name, groupName })
      await refresh()
      select(created.id)
      setName('')
      setShowForm(false)
      toast.success(`Дисциплина «${created.name}» создана`)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <section className="discipline-picker">
        <Spinner label="Загружаем дисциплины…" />
      </section>
    )
  }

  return (
    <section className="discipline-picker">
      <div className="discipline-picker__head">
        <span className="discipline-picker__icon">
          <Layers3 size={22} />
        </span>
        <div>
          <p className="eyebrow">{role === 'admin' ? 'Кабинет преподавателя' : 'Дневник студента'}</p>
          <h1>
            {disciplines.length
              ? 'Выберите дисциплину'
              : role === 'admin'
                ? 'Создайте первую дисциплину'
                : 'Дисциплин пока нет'}
          </h1>
          <p className="muted">
            {role === 'admin'
              ? 'Дисциплина привязывается к группе. Задания и журнал внутри неё видны только этой группе.'
              : disciplines.length
                ? 'Дисциплины вашей группы. Выберите ту, по которой хотите открыть журнал и сдать работу.'
                : 'Преподаватель ещё не создал дисциплину для вашей группы. Загляните позже.'}
          </p>
        </div>
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : null}
      {formError && role === 'admin' && !showForm ? <ErrorBox>{formError}</ErrorBox> : null}

      {disciplines.length ? (
        <div className="discipline-grid">
          {disciplines.map((discipline) => (
            <button
              key={discipline.id}
              type="button"
              className="discipline-card"
              onClick={() => select(discipline.id)}
            >
              <span className="discipline-card__top">
                <span className="discipline-card__icon">
                  <BookOpenCheck size={19} />
                </span>
                <span className="discipline-card__group">
                  <Users size={13} /> группа {discipline.group_name}
                </span>
              </span>
              <strong>{discipline.name}</strong>
              <span className="discipline-card__teacher">{discipline.teacher_name}</span>
              <span className="discipline-card__open">
                Открыть <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      ) : role === 'student' ? (
        <EmptyState
          icon={<BookOpenCheck size={24} />}
          title="Пока пусто"
          text="Когда преподаватель создаст дисциплину для группы, она появится здесь."
        />
      ) : null}

      {role === 'admin' ? (
        showForm ? (
          <form className="discipline-form" onSubmit={createDiscipline}>
            <div className="discipline-form__head">
              <h2>{disciplines.length ? 'Новая дисциплина' : 'Дисциплина и группа'}</h2>
              <p className="muted">
                Например: «Информатика» для группы {groupName || '211'}.
              </p>
            </div>
            <label className="field">
              <span>Название дисциплины</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Информатика"
                maxLength={150}
                required
              />
            </label>
            <label className="field">
              <span>Группа</span>
              <select
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                required
              >
                {groups.map((group) => (
                  <option key={group.name} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            {formError ? <ErrorBox>{formError}</ErrorBox> : null}
            <div className="discipline-form__actions">
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Создать дисциплину
              </button>
              {disciplines.length ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError('')
                  }}
                >
                  Отмена
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <button className="btn btn-ghost discipline-add" type="button" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Добавить дисциплину
          </button>
        )
      ) : null}
    </section>
  )
}
