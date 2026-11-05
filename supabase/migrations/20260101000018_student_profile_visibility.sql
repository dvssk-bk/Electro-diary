-- ============================================================
-- Профили студентов видны всем авторизованным
--
-- Рейтинг «Топ 10» в доп. заданиях общий для всех групп, поэтому
-- из него нужно открывать профиль любого студента, а не только
-- одногруппника.
--
-- Выполнить после 20260101000017_profile_extras.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

drop policy if exists profiles_select_students on public.profiles;
create policy profiles_select_students on public.profiles
  for select to authenticated
  using (role = 'student');

notify pgrst, 'reload schema';
