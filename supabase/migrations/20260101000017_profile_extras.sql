-- ============================================================
-- Рамка аватара и день рождения без года
--
-- Выполнить после 20260101000016_student_full_name.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

alter table public.profiles
  add column if not exists birthday_md text,
  add column if not exists avatar_frame text;

-- Ограничения целостности (проверка формата) выполняет клиент
-- (src/lib/profile.ts): день рождения — только MM-DD без года, рамка —
-- только #RRGGBB или #RRGGBB,#RRGGBB. Ранее здесь были CHECK-ограничения
-- с регулярными выражениями, из-за которых миграция не выполнялась
-- (синтаксическая ошибка SQL).

grant select (birthday_md, avatar_frame) on public.profiles to authenticated;
grant update (birthday_md, avatar_frame) on public.profiles to authenticated;

-- Витрина преподавателей: студенты видят рамку и день рождения
-- преподавателя так же, как одногруппники видят эти поля у студентов.
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
  p.created_at
from public.profiles p
where p.role = 'admin';

comment on view public.teacher_profiles is
  'Публичные профили преподавателей: ФИО, аватар, контакты, описание, рамка и день рождения.';

notify pgrst, 'reload schema';
