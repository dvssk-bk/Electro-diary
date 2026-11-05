export type Role = 'student' | 'admin'
export type GradeType = 'stars' | 'pass_fail' | 'points'

export interface Profile {
  id: string
  role: Role
  full_name: string
  group_name: string | null
  created_at: string
  /** Логин текущего пользователя. Заполняется только для собственной сессии. */
  login?: string | null
  avatar_url?: string | null
  contact_email?: string | null
  phone?: string | null
  bio?: string | null
  /** День рождения в формате `MM-DD`. Год не хранится и не показывается. */
  birthday_md?: string | null
  /** Рамка аватара: `#RRGGBB` или `#RRGGBB,#RRGGBB` (градиент). */
  avatar_frame?: string | null
}

/**
 * Патч для обновления собственного профиля: обновляются только
 * переданные поля, поэтому формы (контакты, рамка, день рождения)
 * не затирают изменения друг друга.
 */
export interface ProfileInput {
  contact_email?: string | null
  phone?: string | null
  bio?: string | null
  birthday_md?: string | null
  avatar_frame?: string | null
}

export interface TestDataResult {
  studentsCreated: number
  assignmentsCreated: number
  studentsSkipped: number
  assignmentsSkipped: number
  errors: string[]
}

export interface Group {
  name: string
  created_at: string
}

export interface DisciplineStats {
  /**
   * Проверенные задания: у студента — с оценкой, у преподавателя — все сдачи
   * по заданию уже проверены.
   */
  graded: number
  /**
   * Новые задания: у студента — без сдачи, у преподавателя — ещё не проверены
   * полностью (включая задания без сдач).
   */
  new: number
}

export interface Discipline {
  id: string
  name: string
  group_name: string
  teacher_id: string
  teacher_name: string
  created_at: string
  stats?: DisciplineStats
}

export interface AssignmentAttachment {
  id: string
  assignment_id: string
  file_path: string
  original_name: string
  mime: string
  size: number
  created_at: string
}

export interface Assignment {
  id: string
  discipline_id: string | null
  title: string
  description: string
  group_name: string
  subject: string
  grade_type: GradeType
  assigned_date: string
  lesson_number: number
  due_at: string | null
  created_at: string
  attachments?: AssignmentAttachment[]
}

export type SubmissionStatus = 'submitted' | 'reviewed' | 'revoked'

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  file_path: string | null
  original_name: string | null
  mime: string | null
  size: number | null
  submitted_at: string
  grade: number | null
  status: SubmissionStatus
  version: number
  reviewed_at: string | null
  file_deleted_at: string | null
  updated_at: string
}

export interface SubmissionVersion {
  id: string
  submission_id: string
  file_path: string | null
  original_name: string | null
  mime: string | null
  size: number | null
  version: number
  created_at: string
  file_deleted_at: string | null
}

export interface AnnotationRange {
  start: number
  end: number
  text: string
}

export interface AnnotationRect {
  x: number
  y: number
  w: number
  h: number
}

export interface Annotation {
  id: string
  submission_id: string
  kind: 'pdf' | 'text'
  page: number | null
  rects: AnnotationRect[] | null
  range: AnnotationRange | null
  color: string
  comment: string
  created_by: string | null
  created_at: string
}

export interface JournalEntry {
  submission_id: string | null
  assignment_id: string
  student_id: string
  grade: number | null
  status: SubmissionStatus | null
  submitted_at: string | null
  /** Активные замечания: оставленные после последней загруженной версии. */
  annotation_count: number
}

export interface JournalData {
  assignments: Assignment[]
  students: Profile[]
  entries: JournalEntry[]
}

export interface StudentCredentials {
  login: string
  password: string
  fullName?: string
  groupName?: string
}

export interface TeacherRegistration {
  profile: Profile
  login: string
}

export interface NewAssignment {
  title: string
  description: string
  discipline_id: string
  grade_type: GradeType
  assigned_date: string
  lesson_number: number
  due_at: string | null
}

export interface NewDiscipline {
  name: string
  groupName: string
}

export interface WorkRow {
  submission: Submission
  assignment: Assignment
  student: Pick<
    Profile,
    'id' | 'full_name' | 'group_name' | 'avatar_url' | 'avatar_frame' | 'birthday_md'
  >
}

/** Общее дополнительное задание: не привязано к дисциплине и видно всем группам. */
export interface ExtraAssignment {
  id: string
  title: string
  description: string
  due_at: string | null
  created_by: string | null
  created_at: string
}

export interface NewExtraAssignment {
  title: string
  description: string
  due_at: string | null
}

export type ExtraSubmissionStatus = 'submitted' | 'reviewed'

export interface ExtraSubmission {
  id: string
  assignment_id: string
  student_id: string
  file_path: string | null
  original_name: string | null
  mime: string | null
  size: number | null
  submitted_at: string
  grade: number | null
  status: ExtraSubmissionStatus
  reviewed_at: string | null
  updated_at: string
}

export interface ExtraWorkRow {
  submission: ExtraSubmission
  assignment: ExtraAssignment
  student: Pick<
    Profile,
    'id' | 'full_name' | 'group_name' | 'avatar_url' | 'avatar_frame' | 'birthday_md'
  >
}

export interface ExtraLeaderboardEntry {
  student_id: string
  full_name: string
  group_name: string | null
  avatar_url?: string | null
  avatar_frame?: string | null
  total_points: number
  graded_count: number
}

export type UploadProgress = (percent: number) => void

export interface FileWithMeta {
  path: string
  name: string
  mime: string | null
  size: number | null
}
