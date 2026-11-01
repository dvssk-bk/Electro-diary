-- ============================================================
-- Профили студентов: аватар, контакты и описание
--
-- Выполнить после 20260101000014_assignment_files.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

-- Студент, как и преподаватель, может менять только свои
-- контактные поля. Колоночные гранты из миграций 2 и 12 не дают
-- изменить ФИО, роль, логин или группу.
revoke update (group_name) on public.profiles from authenticated;
grant update (contact_email, phone, bio, avatar_path) on public.profiles to authenticated;

drop policy if exists profiles_admin_update_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Аватары: каждый авторизованный пользователь загружает, меняет
-- и удаляет только файлы в своей папке. Читать аватары могут все.
drop policy if exists diary_avatars_insert on storage.objects;
create policy diary_avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists diary_avatars_update on storage.objects;
create policy diary_avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists diary_avatars_delete on storage.objects;
create policy diary_avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
