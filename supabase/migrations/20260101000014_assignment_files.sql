-- ============================================================
-- Файлы, которые преподаватель прикрепляет к заданию.
-- Суммарный размер файлов одного задания — не больше 10 МБ.
-- ============================================================

create table if not exists public.assignment_attachments (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  file_path     text not null unique,
  original_name text not null check (char_length(btrim(original_name)) between 1 and 255),
  mime          text not null,
  size          bigint not null check (size > 0 and size <= 10485760),
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists assignment_attachments_assignment_idx
  on public.assignment_attachments (assignment_id);

alter table public.assignment_attachments enable row level security;

revoke all on public.assignment_attachments from anon, authenticated;
grant select, insert, delete on public.assignment_attachments to authenticated;

-- ---------- Политики: метаданные файлов ----------
drop policy if exists assignment_attachments_select on public.assignment_attachments;
create policy assignment_attachments_select on public.assignment_attachments
  for select to authenticated
  using (
    exists (
      select 1
      from public.assignments a
      where a.id = assignment_id
        and (
          public.teacher_owns_discipline(a.discipline_id)
          or public.student_can_access_discipline(a.discipline_id)
        )
    )
  );

drop policy if exists assignment_attachments_insert on public.assignment_attachments;
create policy assignment_attachments_insert on public.assignment_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_id
        and public.teacher_owns_discipline(a.discipline_id)
    )
  );

drop policy if exists assignment_attachments_delete on public.assignment_attachments;
create policy assignment_attachments_delete on public.assignment_attachments
  for delete to authenticated
  using (
    exists (
      select 1
      from public.assignments a
      where a.id = assignment_id
        and public.teacher_owns_discipline(a.discipline_id)
    )
  );

-- ---------- Защита от превышения суммарного лимита ----------
create or replace function public.enforce_assignment_attachments_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_size bigint;
begin
  select coalesce(sum(size), 0)
    into total_size
  from public.assignment_attachments
  where assignment_id = new.assignment_id
    and (tg_op = 'INSERT' or id <> new.id);

  if total_size + new.size > 10485760 then
    raise exception 'Общий размер файлов задания не должен превышать 10 МБ';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_assignment_attachments_limit() from public;

drop trigger if exists assignment_attachments_limit on public.assignment_attachments;
create trigger assignment_attachments_limit
  before insert or update of assignment_id, size on public.assignment_attachments
  for each row execute function public.enforce_assignment_attachments_limit();

-- ---------- Приватный бакет для файлов заданий ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment_files',
  'assignment_files',
  false,
  10485760,
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

-- Путь объекта: {assignment_id}/{uuid}.{ext}
drop policy if exists diary_assignment_files_select on storage.objects;
create policy diary_assignment_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'assignment_files'
    and exists (
      select 1
      from public.assignments a
      where a.id::text = (storage.foldername(name))[1]
        and (
          public.teacher_owns_discipline(a.discipline_id)
          or public.student_can_access_discipline(a.discipline_id)
        )
    )
  );

drop policy if exists diary_assignment_files_insert on storage.objects;
create policy diary_assignment_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assignment_files'
    and exists (
      select 1
      from public.assignments a
      where a.id::text = (storage.foldername(name))[1]
        and public.teacher_owns_discipline(a.discipline_id)
    )
  );

drop policy if exists diary_assignment_files_delete on storage.objects;
create policy diary_assignment_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'assignment_files'
    and exists (
      select 1
      from public.assignments a
      where a.id::text = (storage.foldername(name))[1]
        and public.teacher_owns_discipline(a.discipline_id)
    )
  );

comment on table public.assignment_attachments is
  'Файлы преподавателя, прикреплённые к заданию. Суммарный размер — до 10 МБ.';
