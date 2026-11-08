-- ============================================================
-- Эмодзи-аватар, узор фона карточки и градиентный акцент
--
-- Градиентный акцент хранится в существующем accent_color как
-- `#RRGGBB,#RRGGBB`, поэтому отдельной колонки не требует.
--
-- Выполнить после 20260101000022_profile_accent.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

alter table public.profiles
  add column if not exists avatar_emoji text,
  add column if not exists card_pattern text;

-- Формат проверяет клиент (src/lib/profile.ts): эмодзи — короткая строка,
-- узор — одно из значений dots / grid / diagonal / paper.

grant select (avatar_emoji, card_pattern) on public.profiles to authenticated;
grant update (avatar_emoji, card_pattern) on public.profiles to authenticated;

-- Витрина преподавателей: студенты видят эмодзи и узор карточки.
drop view if exists public.teacher_profiles;

create view public.teacher_profiles
with (security_barrier = true, security_invoker = true) as
select
  p.id,
  p.full_name,
  p.avatar_path,
  p.contact_email,
  p.phone,
  p.bio,
  p.birthday_md,
  p.avatar_frame,
  p.accent_color,
  p.avatar_emoji,
  p.card_pattern,
  p.created_at
from public.profiles p
where p.role = 'admin';

revoke all on public.teacher_profiles from anon, authenticated;
grant select on public.teacher_profiles to authenticated;

comment on view public.teacher_profiles is
  'Публичные профили преподавателей: ФИО, аватар, эмодзи, контакты, описание, оформление и день рождения.';

-- Рейтинг «Топ 10»: эмодзи-аватар вместо инициалов.
drop view if exists public.extra_leaderboard;

create view public.extra_leaderboard
with (security_barrier = true) as
select
  p.id as student_id,
  p.full_name,
  p.group_name,
  p.avatar_path,
  p.avatar_frame,
  p.avatar_emoji,
  coalesce(sum(s.grade), 0)::int as total_points,
  count(s.grade)::int as graded_count
from public.profiles p
join public.extra_submissions s
  on s.student_id = p.id
 and s.grade is not null
where p.role = 'student'
group by p.id, p.full_name, p.group_name, p.avatar_path, p.avatar_frame, p.avatar_emoji;

revoke all on public.extra_leaderboard from anon, authenticated;
grant select on public.extra_leaderboard to authenticated;

notify pgrst, 'reload schema';
