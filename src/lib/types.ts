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
  /** Акцентный цвет профиля: `#RRGGBB` или `#RRGGBB,#RRGGBB` (градиент). */
  accent_color?: string | null
  /** Эмодзи вместо аватара, если фото не загружено. */
  avatar_emoji?: string | null
  /** Градиентный фон профиля: `sunset`, `mint`, `lavender`, `sky`, `peach` и др. */
  card_pattern?: string | null
  /** Градиентная обложка над аватаром; значения из общего каталога градиентов. */
  profile_cover?: string | null
  /** Своя картинка обложки; показывается вместо градиента, если загружена. */
  profile_cover_url?: string | null
  /** Масштаб своей обложки в процентах (100 — без увеличения). */
  profile_cover_zoom?: number | null
  /** Сдвиг своей обложки по горизонтали, проценты от размера картинки. */
  profile_cover_x?: number | null
  /** Сдвиг своей обложки по вертикали, проценты от размера картинки. */
  profile_cover_y?: number | null
  /** Градиентный фон всей страницы; значения из общего каталога градиентов. */
  page_background?: string | null
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
  accent_color?: string | null
  avatar_emoji?: string | null
  card_pattern?: string | null
  profile_cover?: string | null
  profile_cover_zoom?: number | null
  profile_cover_x?: number | null
  profile_cover_y?: number | null
  page_background?: string | null
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

/** Доступ к групповому журналу, выданный администратором. */
export interface GroupViewer {
  group_name: string
  user_id: string
  created_by: string | null
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
  /** Короткий текстовый ответ студента (до 150 символов). */
  answer_text: string | null
  submitted_at: string
  grade: number | null
  status: SubmissionStatus
  version: number
  reviewed_at: string | null
  file_deleted_at: string | null
  updated_at: string
}

export interface SubmissionSticker {
  id: string
  submission_id: string
  teacher_id: string
  emoji: string
  created_at: string
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

export type GradeAppealStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

/** Просьба студента пересмотреть выставленную оценку. */
export interface GradeAppeal {
  id: string
  submission_id: string
  student_id: string
  message: string
  status: GradeAppealStatus
  /** Комментарий преподавателя при решении. */
  teacher_comment: string | null
  resolved_by: string | null
  created_at: string
  resolved_at: string | null
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
  /** Есть ли по работе апелляция на рассмотрении. */
  appeal_pending?: boolean
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

/** Результат сброса пароля администратором: новый пароль показывается один раз. */
export interface PasswordResetResult {
  login: string
  password: string
  fullName: string
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
    | 'id'
    | 'full_name'
    | 'group_name'
    | 'avatar_url'
    | 'avatar_frame'
    | 'avatar_emoji'
    | 'birthday_md'
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
  /** Время удаления файла после проверки; оценка и имя файла сохраняются. */
  file_deleted_at?: string | null
  updated_at: string
}

export interface ExtraWorkRow {
  submission: ExtraSubmission
  assignment: ExtraAssignment
  student: Pick<
    Profile,
    | 'id'
    | 'full_name'
    | 'group_name'
    | 'avatar_url'
    | 'avatar_frame'
    | 'avatar_emoji'
    | 'birthday_md'
  >
}

export interface ExtraLeaderboardEntry {
  student_id: string
  full_name: string
  group_name: string | null
  avatar_url?: string | null
  avatar_frame?: string | null
  avatar_emoji?: string | null
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
