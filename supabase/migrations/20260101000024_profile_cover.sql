-- ============================================================
-- Обложка профиля и расширенный набор градиентов
--
-- Обложка хранится как токен градиента из общего каталога
-- (sunset, mint, lavender, …), поэтому отдельного бакета не нужно.
-- Набор значений проверяется на клиенте: src/lib/profile.ts.
--
-- Выполнить после 20260101000023_profile_avatar_pattern.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

alter table public.profiles
  add column if not exists profile_cover text;

grant select (profile_cover) on public.profiles to authenticated;
grant update (profile_cover) on public.profiles to authenticated;

-- Витрина преподавателей: студенты видят обложку так же, как остальное оформление.
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
  p.profile_cover,
  p.created_at
from public.profiles p
where p.role = 'admin';

revoke all on public.teacher_profiles from anon, authenticated;
grant select on public.teacher_profiles to authenticated;

comment on view public.teacher_profiles is
  'Публичные профили преподавателей: ФИО, аватар, контакты, описание, оформление и день рождения.';

notify pgrst, 'reload schema';
