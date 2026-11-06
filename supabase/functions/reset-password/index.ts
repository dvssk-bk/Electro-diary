// Supabase Edge Function: reset-password
// Сбрасывает пароль студента через официальный Supabase Admin API
// (auth.admin.updateUserById). Пароли в Supabase хранятся как хеш,
// поэтому посмотреть старый нельзя — можно только задать новый.
//
// Доступно только администратору дневника (profiles.role = 'admin').
// service_role не попадает во фронтенд.
//
// Деплой:
//   supabase functions deploy reset-password --no-verify-jwt
// Секреты SUPABASE_URL, SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY
// доступны Edge Function автоматически.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function randomPassword(length = 10): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
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

  // Проверяем вызывающего по его JWT, а не по service_role.
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
    return json({ error: 'Не удалось проверить права администратора' }, 500)
  }
  if (callerProfile?.role !== 'admin') {
    return json({ error: 'Сбрасывать пароли может только администратор' }, 403)
  }

  let payload: { login?: string; newPassword?: string | null }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }

  const raw = String(payload.login ?? '').trim()
  const isStudentId = UUID_RE.test(raw)
  let login = raw.toLowerCase()
  if (!isStudentId && login.endsWith('@diary.local')) {
    login = login.slice(0, -'@diary.local'.length)
  }
  if (!raw) return json({ error: 'Введите логин студента' }, 400)

  const newPassword = payload.newPassword ? String(payload.newPassword) : ''
  if (newPassword) {
    if (newPassword.length < 8) {
      return json({ error: 'Пароль должен содержать минимум 8 символов' }, 400)
    }
    if (newPassword.length > 72) {
      return json({ error: 'Пароль должен быть не длиннее 72 символов' }, 400)
    }
  }

  const { data: target, error: targetError } = isStudentId
    ? await admin
        .from('profiles')
        .select('id, role, full_name, login')
        .eq('id', raw)
        .maybeSingle()
    : await admin
        .from('profiles')
        .select('id, role, full_name, login')
        .eq('login', login)
        .maybeSingle()
  if (targetError) {
    return json({ error: 'Не удалось найти студента' }, 500)
  }
  if (!target) return json({ error: 'Студент с таким логином не найден' }, 404)
  if (target.role !== 'student') {
    return json({ error: 'Сбрасывать пароль можно только студенту' }, 403)
  }

  const password = newPassword || randomPassword()
  const { error: updateError } = await admin.auth.admin.updateUserById(target.id, {
    password,
  })
  if (updateError) {
    return json({ error: `Не удалось изменить пароль: ${updateError.message}` }, 500)
  }

  return json({
    login: target.login || raw,
    password,
    fullName: target.full_name,
  })
})
