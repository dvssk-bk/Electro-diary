-- ============================================================
-- Акцентный цвет профиля
--
-- Выполнить после 20260101000021_group_viewers.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

alter table public.profiles
  add column if not exists accent_color text;

-- Формат `#RRGGBB` проверяет клиент (src/lib/profile.ts). Цвет только
-- декоративный, поэтому CHECK-ограничение не требуется.

grant select (accent_color) on public.profiles to authenticated;
grant update (accent_color) on public.profiles to authenticated;

-- Витрина преподавателей: акцентный цвет преподавателя виден студентам
-- так же, как рамка и день рождения.
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
  p.created_at
from public.profiles p
where p.role = 'admin';

revoke all on public.teacher_profiles from anon, authenticated;
grant select on public.teacher_profiles to authenticated;

comment on view public.teacher_profiles is
  'Публичные профили преподавателей: ФИО, аватар, контакты, описание, рамка, акцент и день рождения.';

notify pgrst, 'reload schema';
