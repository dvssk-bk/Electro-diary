-- ============================================================
-- Фон всей страницы и положение своей обложки
--
-- page_background — градиент из общего каталога, который виден
-- на всей странице дневника, а не только в карточке профиля.
-- profile_cover_zoom/x/y — масштаб и сдвиг загруженной обложки;
-- действуют только на свою картинку, градиент не трогают.
--
-- Выполнить после 20260101000026_grade_appeals.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

alter table public.profiles
  add column if not exists page_background text,
  add column if not exists profile_cover_zoom smallint,
  add column if not exists profile_cover_x smallint,
  add column if not exists profile_cover_y smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_profile_cover_zoom_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_cover_zoom_check
      check (profile_cover_zoom is null or profile_cover_zoom between 100 and 250);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_profile_cover_x_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_cover_x_check
      check (profile_cover_x is null or profile_cover_x between -50 and 50);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_profile_cover_y_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_cover_y_check
      check (profile_cover_y is null or profile_cover_y between -50 and 50);
  end if;
end
$$;

grant select (page_background, profile_cover_zoom, profile_cover_x, profile_cover_y)
  on public.profiles to authenticated;
grant update (page_background, profile_cover_zoom, profile_cover_x, profile_cover_y)
  on public.profiles to authenticated;

-- Витрина преподавателей: студенты видят фон страницы и положение обложки.
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
  p.profile_cover_path,
  p.profile_cover_zoom,
  p.profile_cover_x,
  p.profile_cover_y,
  p.page_background,
  p.created_at
from public.profiles p
where p.role = 'admin';

revoke all on public.teacher_profiles from anon, authenticated;
grant select on public.teacher_profiles to authenticated;

comment on view public.teacher_profiles is
  'Публичные профили преподавателей: ФИО, аватар, контакты, описание и оформление.';

notify pgrst, 'reload schema';
