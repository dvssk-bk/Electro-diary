import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { backend } from '../lib/api'
import type { Discipline } from '../lib/types'
import { useAuth } from './AuthContext'

interface DisciplineContextValue {
  disciplines: Discipline[]
  active: Discipline | null
  loading: boolean
  initialized: boolean
  error: string
  select: (id: string | null) => void
  refresh: () => Promise<void>
}

const DisciplineContext = createContext<DisciplineContextValue | null>(null)

function storageKey(profileId: string): string {
  return `diary_discipline_${profileId}`
}

function savedDiscipline(profileId: string): string | null {
  try {
    return localStorage.getItem(storageKey(profileId))
  } catch {
    return null
  }
}

export function DisciplineProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState('')
  const profileId = profile?.id ?? null
  const previousProfileId = useRef<string | null>(null)

  // После выхода из аккаунта не возвращаем преподавателя сразу в последнюю
  // дисциплину: при следующем входе он должен увидеть экран выбора.
  useEffect(() => {
    const previous = previousProfileId.current
    if (previous && previous !== profileId) {
      try {
        localStorage.removeItem(storageKey(previous))
      } catch {
        // localStorage может быть недоступен в приватном режиме.
      }
    }
    previousProfileId.current = profileId
  }, [profileId])

  const load = useCallback(
    async (keepSelection: boolean) => {
      if (!profileId) {
        setDisciplines([])
        setActiveId(null)
        setLoading(false)
        setError('')
        return
      }
      setLoading(true)
      setError('')
      try {
        const list = await backend.disciplines.list()
        setDisciplines(list)
        setActiveId((current) => {
          if (keepSelection && current && list.some((item) => item.id === current)) {
            return current
          }
          const saved = savedDiscipline(profileId)
          const savedValid = saved && list.some((item) => item.id === saved) ? saved : null
          if (savedValid) return savedValid
          // Преподаватель всегда выбирает дисциплину явно. Студенту с одной
          // дисциплиной удобнее сразу открыть её.
          if (profile?.role === 'student' && list.length === 1) return list[0].id
          return null
        })
      } catch (err) {
        setDisciplines([])
        setActiveId(null)
        setError((err as Error).message)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    },
    [profileId, profile?.role],
  )

  useEffect(() => {
    setDisciplines([])
    setActiveId(null)
    setInitialized(false)
    void load(false)
  }, [load])

  const select = useCallback(
    (id: string | null) => {
      setActiveId(id)
      if (!profileId) return
      try {
        if (id) localStorage.setItem(storageKey(profileId), id)
        else localStorage.removeItem(storageKey(profileId))
      } catch {
        // localStorage может быть недоступен в приватном режиме.
      }
    },
    [profileId],
  )

  const refresh = useCallback(async () => {
    await load(true)
  }, [load])

  const active = disciplines.find((item) => item.id === activeId) ?? null

  const value = useMemo(
    () => ({ disciplines, active, loading, initialized, error, select, refresh }),
    [disciplines, active, loading, initialized, error, select, refresh],
  )

  return <DisciplineContext.Provider value={value}>{children}</DisciplineContext.Provider>
}

export function useDisciplines(): DisciplineContextValue {
  const value = useContext(DisciplineContext)
  if (!value) {
    throw new Error('useDisciplines должен использоваться внутри DisciplineProvider')
  }
  return value
}
