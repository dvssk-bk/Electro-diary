-- ============================================================
-- Дополнительные задания для всех групп
--
-- Выполнить после 20260101000012_teacher_profiles.sql.
-- Миграция идемпотентна: её можно запускать повторно.
--
-- Что меняется:
--   * преподаватель создаёт доп. задания без привязки к дисциплине;
--   * задания видны студентам всех групп;
--   * все доп. работы оцениваются только в баллах 0–100;
--   * появляется рейтинг «Топ 10» по сумме баллов среди всех групп;
--   * файлы доп. работ хранятся в отдельном приватном бакете.
-- ============================================================

-- ---------- Задания ----------
create table if not exists public.extra_assignments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '',
  due_at      timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists extra_assignments_created_idx
  on public.extra_assignments (created_at desc);

-- ---------- Работы студентов ----------
create table if not exists public.extra_submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.extra_assignments (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  file_path     text,
  original_name text,
  mime          text,
  size          bigint check (size is null or size > 0),
  submitted_at  timestamptz not null default now(),
  grade         integer check (grade between 0 and 100),
  status        text not null default 'submitted'
                check (status in ('submitted', 'reviewed')),
  reviewed_at   timestamptz,
  updated_at    timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create index if not exists extra_submissions_assignment_idx
  on public.extra_submissions (assignment_id, submitted_at desc);
create index if not exists extra_submissions_student_idx
  on public.extra_submissions (student_id);
create index if not exists extra_submissions_grade_idx
  on public.extra_submissions (grade)
  where grade is not null;

drop trigger if exists extra_submissions_touch_updated_at on public.extra_submissions;
create trigger extra_submissions_touch_updated_at
  before update on public.extra_submissions
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.extra_assignments enable row level security;
alter table public.extra_submissions enable row level security;

revoke all on public.extra_assignments from anon, authenticated;
grant select, insert, update, delete on public.extra_assignments to authenticated;

revoke all on public.extra_submissions from anon, authenticated;
grant select, insert, update, delete on public.extra_submissions to authenticated;

drop policy if exists extra_assignments_select on public.extra_assignments;
create policy extra_assignments_select on public.extra_assignments
  for select to authenticated
  using (true);

drop policy if exists extra_assignments_admin_write on public.extra_assignments;
create policy extra_assignments_admin_write on public.extra_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists extra_submissions_select on public.extra_submissions;
create policy extra_submissions_select on public.extra_submissions
  for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists extra_submissions_insert_own on public.extra_submissions;
create policy extra_submissions_insert_own on public.extra_submissions
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and grade is null
    and status = 'submitted'
    and file_path is not null
    and original_name is not null
    and size is not null
    and file_path like auth.uid()::text || '/' || assignment_id::text || '/%'
    and exists (
      select 1 from public.extra_assignments a
      where a.id = assignment_id
    )
  );

drop policy if exists extra_submissions_update_own on public.extra_submissions;
create policy extra_submissions_update_own on public.extra_submissions
  for update to authenticated
  using (student_id = auth.uid() and grade is null)
  with check (
    student_id = auth.uid()
    and grade is null
    and status = 'submitted'
    and file_path is not null
    and original_name is not null
    and size is not null
    and file_path like auth.uid()::text || '/' || assignment_id::text || '/%'
    and exists (
      select 1 from public.extra_assignments a
      where a.id = assignment_id
    )
  );

drop policy if exists extra_submissions_admin_update on public.extra_submissions;
create policy extra_submissions_admin_update on public.extra_submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists extra_submissions_admin_delete on public.extra_submissions;
create policy extra_submissions_admin_delete on public.extra_submissions
  for delete to authenticated
  using (public.is_admin());

-- Студент не может подменить оценку, статус, студента или задание даже при
-- ослаблении RLS. Преподаватель может менять всё.
create or replace function public.guard_extra_submission_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.grade is not null then
    raise exception 'Оценённая работа заблокирована';
  end if;
  if new.student_id is distinct from old.student_id then
    raise exception 'Нельзя изменить студента у работы';
  end if;
  if new.assignment_id is distinct from old.assignment_id then
    raise exception 'Нельзя изменить задание у работы';
  end if;
  if new.grade is distinct from old.grade then
    raise exception 'Баллы выставляет только преподаватель';
  end if;
  if new.status <> 'submitted' then
    raise exception 'Нельзя изменить статус работы';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_extra_submission_update() from public;

drop trigger if exists extra_submissions_guard_student_update on public.extra_submissions;
create trigger extra_submissions_guard_student_update
  before update on public.extra_submissions
  for each row execute function public.guard_extra_submission_update();

-- ---------- Рейтинг «Топ 10» ----------
-- Сумма баллов по всем оценённым доп. работам среди всех групп.
create or replace view public.extra_leaderboard
with (security_barrier = true) as
select
  p.id as student_id,
  p.full_name,
  p.group_name,
  coalesce(sum(s.grade), 0)::int as total_points,
  count(s.grade)::int as graded_count
from public.profiles p
join public.extra_submissions s
  on s.student_id = p.id
 and s.grade is not null
where p.role = 'student'
group by p.id, p.full_name, p.group_name;

revoke all on public.extra_leaderboard from anon, authenticated;
grant select on public.extra_leaderboard to authenticated;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'extra_submissions',
  'extra_submissions',
  false,
  52428800, -- 50 МБ
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.rar',
    'application/x-rar-compressed',
    'video/mp4',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists diary_extra_submissions_select on storage.objects;
create policy diary_extra_submissions_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'extra_submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists diary_extra_submissions_insert on storage.objects;
create policy diary_extra_submissions_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'extra_submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.extra_assignments a
      where a.id::text = (storage.foldername(name))[2]
    )
    and not exists (
      select 1 from public.extra_submissions s
      where s.student_id = auth.uid()
        and s.assignment_id::text = (storage.foldername(name))[2]
        and s.grade is not null
    )
  );

drop policy if exists diary_extra_submissions_delete on storage.objects;
create policy diary_extra_submissions_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'extra_submissions'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        -- Студент может удалить свой старый файл, но не текущий файл
        -- оценённой работы: после выставления баллов работа заблокирована.
        and not exists (
          select 1 from public.extra_submissions s
          where s.student_id = auth.uid()
            and s.file_path = name
            and s.grade is not null
        )
      )
    )
  );

-- ---------- Комментарии ----------
comment on table public.extra_assignments is
  'Дополнительные задания, не привязанные к дисциплине. Видны студентам всех групп.';
comment on table public.extra_submissions is
  'Сдачи дополнительных заданий. Оцениваются только в баллах 0–100.';
comment on view public.extra_leaderboard is
  'Топ студентов по сумме баллов за дополнительные задания среди всех групп.';

notify pgrst, 'reload schema';
