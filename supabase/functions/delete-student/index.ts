// Supabase Edge Function: delete-student
// Полностью удаляет аккаунт студента: auth.users, профиль, сдачи, версии,
// замечания и файлы в Storage. Доступно только преподавателю.
//
// Деплой:
//   supabase functions deploy delete-student --no-verify-jwt
// Секреты SUPABASE_URL, SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY
// доступны Edge Function автоматически.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Сервер не настроен: отсутствуют переменные Supabase' }, 500)
  }

  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    return json({ error: 'Нужно войти в дневник' }, 401)
  }

  // Проверяем вызывающего через его JWT, а не через service_role.
  const caller = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data: authData, error: authError } = await caller.auth.getUser()
  if (authError || !authData.user) {
    return json({ error: 'Сессия истекла — войдите заново' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerProfile, error: callerError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (callerError) {
    return json({ error: 'Не удалось проверить права преподавателя' }, 500)
  }
  if (callerProfile?.role !== 'admin') {
    return json({ error: 'Удалять студентов может только преподаватель' }, 403)
  }

  let payload: { studentId?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }

  const studentId = String(payload.studentId ?? '').trim()
  if (!UUID_RE.test(studentId)) {
    return json({ error: 'Некорректный идентификатор студента' }, 400)
  }
  if (studentId === authData.user.id) {
    return json({ error: 'Нельзя удалить собственный аккаунт' }, 400)
  }

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', studentId)
    .maybeSingle()
  if (targetError) {
    return json({ error: 'Не удалось найти студента' }, 500)
  }
  if (!target) return json({ error: 'Студент не найден' }, 404)
  if (target.role !== 'student') {
    return json({ error: 'Удалять можно только студентов' }, 403)
  }

  // ---------- Собираем файлы обычных работ ----------
  const { data: submissions, error: submissionsError } = await admin
    .from('submissions')
    .select('id, file_path')
    .eq('student_id', studentId)
  if (submissionsError) {
    return json({ error: 'Не удалось прочитать работы студента' }, 500)
  }

  const submissionIds = (submissions ?? []).map((row: { id: string }) => row.id)
  const regularPaths = new Set<string>()
  for (const row of (submissions ?? []) as { file_path: string | null }[]) {
    if (row.file_path) regularPaths.add(row.file_path)
  }

  if (submissionIds.length) {
    const { data: versions, error: versionsError } = await admin
      .from('submission_versions')
      .select('file_path')
      .in('submission_id', submissionIds)
    if (versionsError) {
      return json({ error: 'Не удалось прочитать версии работ' }, 500)
    }
    for (const row of (versions ?? []) as { file_path: string | null }[]) {
      if (row.file_path) regularPaths.add(row.file_path)
    }
  }

  // ---------- Файлы дополнительных работ ----------
  const { data: extraSubmissions, error: extraError } = await admin
    .from('extra_submissions')
    .select('file_path')
    .eq('student_id', studentId)
  if (extraError) {
    return json({ error: 'Не удалось прочитать доп. работы студента' }, 500)
  }
  const extraPaths = new Set<string>()
  for (const row of (extraSubmissions ?? []) as { file_path: string | null }[]) {
    if (row.file_path) extraPaths.add(row.file_path)
  }

  // ---------- Удаляем объекты Storage ----------
  for (const paths of chunk([...regularPaths], 100)) {
    if (!paths.length) continue
    const { error } = await admin.storage.from('submissions').remove(paths)
    if (error) {
      return json({ error: `Не удалось удалить файлы работ: ${error.message}` }, 500)
    }
  }
  for (const paths of chunk([...extraPaths], 100)) {
    if (!paths.length) continue
    const { error } = await admin.storage.from('extra_submissions').remove(paths)
    if (error) {
      return json({ error: `Не удалось удалить файлы доп. работ: ${error.message}` }, 500)
    }
  }

  // ---------- Удаляем auth.users; профиль и сдачи удалятся каскадно ----------
  const { error: deleteError } = await admin.auth.admin.deleteUser(studentId)
  if (deleteError) {
    // Профиль без auth-пользователя — единственный случай, когда можно
    // безопасно удалить строку профиля вручную. Любую другую ошибку Auth
    // возвращаем преподавателю, чтобы не оставить «висящий» аккаунт.
    const authUserMissing = /not found|does not exist/i.test(deleteError.message)
    if (!authUserMissing) {
      return json(
        { error: `Не удалось удалить аккаунт: ${deleteError.message}` },
        500,
      )
    }
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', studentId)
    if (profileError) {
      return json({ error: profileError.message || 'Не удалось удалить студента' }, 500)
    }
  }

  return json({ ok: true, fullName: target.full_name })
})
