-- ============================================================
-- Аватарки в рейтинге «Топ 10»
--
-- В рейтинге показываем аватар и рамку студента, поэтому витрина
-- extra_leaderboard отдаёт avatar_path и avatar_frame. Клиент
-- превращает путь в публичный URL бакета avatars.
--
-- Выполнить после 20260101000018_student_profile_visibility.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

-- Пересоздаём витрину: CREATE OR REPLACE VIEW не позволяет менять
-- состав/порядок колонок (ошибка 42P16).
drop view if exists public.extra_leaderboard;

create view public.extra_leaderboard
with (security_barrier = true) as
select
  p.id as student_id,
  p.full_name,
  p.group_name,
  p.avatar_path,
  p.avatar_frame,
  coalesce(sum(s.grade), 0)::int as total_points,
  count(s.grade)::int as graded_count
from public.profiles p
join public.extra_submissions s
  on s.student_id = p.id
 and s.grade is not null
where p.role = 'student'
group by p.id, p.full_name, p.group_name, p.avatar_path, p.avatar_frame;

revoke all on public.extra_leaderboard from anon, authenticated;
grant select on public.extra_leaderboard to authenticated;

notify pgrst, 'reload schema';
