import type {
  Annotation,
  Assignment,
  AssignmentAttachment,
  Discipline,
  ExtraAssignment,
  ExtraLeaderboardEntry,
  ExtraSubmission,
  ExtraWorkRow,
  GradeAppeal,
  Group,
  JournalData,
  NewAssignment,
  NewDiscipline,
  NewExtraAssignment,
  PasswordResetResult,
  Profile,
  ProfileInput,
  StudentCredentials,
  Submission,
  SubmissionSticker,
  SubmissionVersion,
  TeacherRegistration,
  TestDataResult,
  UploadProgress,
  WorkRow,
} from './types'

export interface AnnotationInput {
  submission_id: string
  kind: 'pdf' | 'text'
  page?: number | null
  rects?: { x: number; y: number; w: number; h: number }[] | null
  range?: { start: number; end: number; text: string } | null
  color: string
  comment: string
}

export interface SubmissionFilters {
  assignmentId?: string
  studentId?: string
}

export interface Backend {
  mode: 'supabase' | 'demo'
  auth: {
    getProfile: () => Promise<Profile | null>
    onAuthChange: (callback: (profile: Profile | null) => void) => () => void
    signIn: (login: string, password: string) => Promise<Profile>
    signOut: () => Promise<void>
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>
    register: (fullName: string, groupName: string) => Promise<StudentCredentials>
    registerTeacher: (fullName: string, password: string) => Promise<TeacherRegistration>
    /**
     * Сброс пароля студента администратором. Если новый пароль не передан,
     * генерируется временный. Возвращённый пароль показывается один раз.
     */
    resetStudentPassword: (
      student: string,
      newPassword?: string,
    ) => Promise<PasswordResetResult>
  }
  disciplines: {
    list: () => Promise<Discipline[]>
    create: (input: NewDiscipline) => Promise<Discipline>
    remove: (id: string) => Promise<void>
  }
  profiles: {
    getTeacher: (id: string) => Promise<Profile | null>
    /** Профиль студента для просмотра: доступен себе, одногруппникам и преподавателю. */
    getStudent: (id: string) => Promise<Profile | null>
    updateMine: (input: ProfileInput) => Promise<Profile>
    /** Смена ФИО собственного профиля (Фамилия Имя Отчество). */
    updateFullName: (fullName: string) => Promise<Profile>
    uploadAvatar: (file: File) => Promise<Profile>
    removeAvatar: () => Promise<Profile>
    /** Своя картинка обложки: файл уже подготовлен (1200×480 JPEG). */
    uploadCover: (file: File) => Promise<Profile>
    removeCover: () => Promise<Profile>
  }
  groups: {
    list: () => Promise<Group[]>
    create: (name: string) => Promise<Group>
    rename: (oldName: string, newName: string) => Promise<void>
    remove: (name: string) => Promise<void>
  }
  students: (groupName: string) => Promise<Profile[]>
  /** Полностью удаляет аккаунт студента вместе с работами и файлами. */
  removeStudent: (studentId: string) => Promise<void>
  assignments: {
    list: (disciplineId: string) => Promise<Assignment[]>
    create: (input: NewAssignment) => Promise<Assignment>
    update: (id: string, input: NewAssignment) => Promise<Assignment>
    remove: (id: string) => Promise<void>
  }
  assignmentFiles: {
    upload: (assignmentId: string, files: File[]) => Promise<AssignmentAttachment[]>
    remove: (attachmentId: string) => Promise<void>
    blob: (path: string) => Promise<Blob>
    url: (path: string) => Promise<string>
    download: (path: string, name: string) => Promise<void>
  }
  journal: (disciplineId: string) => Promise<JournalData>
  submissions: {
    mine: () => Promise<Submission[]>
    list: (disciplineId: string, filters?: SubmissionFilters) => Promise<WorkRow[]>
    get: (id: string) => Promise<Submission>
    upload: (
      assignmentId: string,
      file: File,
      onProgress?: UploadProgress,
      answerText?: string | null,
    ) => Promise<Submission>
    replace: (
      submissionId: string,
      file: File,
      onProgress?: UploadProgress,
      answerText?: string | null,
    ) => Promise<Submission>
    /** Создаёт или обновляет сдачу с коротким текстовым ответом без нового файла. */
    submitText: (assignmentId: string, text: string) => Promise<Submission>
    setGrade: (
      submissionId: string,
      grade: number | null,
      options?: { deleteFiles?: boolean },
    ) => Promise<Submission>
    markSubmitted: (assignmentId: string, studentId: string) => Promise<Submission>
    remove: (submissionId: string) => Promise<void>
    versions: (submissionId: string) => Promise<SubmissionVersion[]>
    saveText: (submissionId: string, text: string) => Promise<Submission>
    /** Эмодзи-реакции преподавателя на сдачу. */
    stickers: {
      list: (submissionId: string) => Promise<SubmissionSticker[]>
      add: (submissionId: string, emoji: string) => Promise<SubmissionSticker>
      remove: (id: string) => Promise<void>
    }
    /** Удаляет файлы проверенных работ, оставшиеся в хранилище. */
    cleanupReviewedFiles: () => Promise<number>
  }
  annotations: {
    list: (submissionId: string) => Promise<Annotation[]>
    create: (input: AnnotationInput) => Promise<Annotation>
    remove: (id: string) => Promise<void>
  }
  gradeAppeals: {
    /** Апелляции по работе: студент видит свои, преподаватель — все. */
    list: (submissionId: string) => Promise<GradeAppeal[]>
    /** Студент просит пересмотреть оценку. */
    create: (submissionId: string, message: string) => Promise<GradeAppeal>
    /** Студент отзывает апелляцию, пока её не рассмотрели. */
    cancel: (id: string) => Promise<void>
    /** Преподаватель принимает или отклоняет апелляцию. */
    resolve: (
      id: string,
      status: 'accepted' | 'rejected',
      comment: string | null,
    ) => Promise<GradeAppeal>
  }
  extra: {
    list: () => Promise<ExtraAssignment[]>
    create: (input: NewExtraAssignment) => Promise<ExtraAssignment>
    update: (id: string, input: NewExtraAssignment) => Promise<ExtraAssignment>
    remove: (id: string) => Promise<void>
    /** Работы студента по доп. заданиям. */
    mine: () => Promise<ExtraSubmission[]>
    /** Все сдачи по доп. заданиям — только преподаватель. */
    works: (assignmentId?: string) => Promise<ExtraWorkRow[]>
    upload: (
      assignmentId: string,
      file: File,
      onProgress?: UploadProgress,
    ) => Promise<ExtraSubmission>
    removeSubmission: (submissionId: string) => Promise<void>
    setGrade: (submissionId: string, grade: number | null) => Promise<ExtraSubmission>
    leaderboard: () => Promise<ExtraLeaderboardEntry[]>
  }
  extraFiles: {
    blob: (path: string) => Promise<Blob>
    url: (path: string) => Promise<string>
    download: (path: string, name: string) => Promise<void>
  }
  testData: {
    /** Добавляет 30 тестовых студентов и 50 заданий в выбранную дисциплину. */
    seed: (disciplineId: string) => Promise<TestDataResult>
  }
  files: {
    blob: (path: string) => Promise<Blob>
    url: (path: string) => Promise<string>
    download: (path: string, name: string) => Promise<void>
  }
  resetDemo?: () => Promise<void>
}
