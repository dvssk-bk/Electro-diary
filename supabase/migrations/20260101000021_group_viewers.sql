-- ============================================================
-- Доступ к групповому журналу по запросу (старосты/наблюдатели)
--
-- Разрешает выбранным студентам просматривать журнал и задания
-- другой группы, не изменяя их собственную группу и не давая им
-- права добавлять задания.
--
-- Выполнить после 20260101000020_extra_file_cleanup.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

create table if not exists public.group_viewers (
  group_name text not null references public.groups (name) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_name, user_id)
);

-- Строки можно добавлять вручную через SQL Editor, где auth.uid() пуст.
alter table public.group_viewers alter column created_by drop not null;

alter table public.group_viewers enable row level security;

drop policy if exists group_viewers_admin_all on public.group_viewers;
create policy group_viewers_admin_all on public.group_viewers
  for all to authenticated
  using (public.is_admin());

drop policy if exists group_viewers_select_own on public.group_viewers;
create policy group_viewers_select_own on public.group_viewers
  for select to authenticated
  using (user_id = auth.uid());

-- Студент может смотреть группу, если она его собственная или он
-- добавлен в список просмотра группами преподавателя.
create or replace function public.student_can_view_group(p_group_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and (
        p.group_name = p_group_name
        or exists (
          select 1
          from public.group_viewers gv
          where gv.user_id = p.id
            and gv.group_name = p_group_name
        )
      )
  );
$$;

revoke all on function public.student_can_view_group(text) from public;
grant execute on function public.student_can_view_group(text) to authenticated;

-- Переиспользуем расширение доступа для дисциплин, заданий и витрин.
create or replace function public.student_can_access_discipline(p_discipline_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.disciplines d
    join public.profiles p on p.id = auth.uid()
    where d.id = p_discipline_id
      and p.role = 'student'
      and public.student_can_view_group(d.group_name)
  );
$$;

revoke all on function public.student_can_access_discipline(uuid) from public;
grant execute on function public.student_can_access_discipline(uuid) to authenticated;

-- Витрина дисциплин: у старост просматривается группа, которую они могут видеть.
create or replace view public.discipline_catalog
with (security_barrier = true) as
select
  d.id,
  d.name,
  d.group_name,
  d.teacher_id,
  p.full_name as teacher_name,
  d.created_at
from public.disciplines d
join public.profiles p on p.id = d.teacher_id
where (
    public.is_admin()
    and d.teacher_id = auth.uid()
  )
  or public.student_can_view_group(d.group_name);

revoke all on public.discipline_catalog from anon, authenticated;
grant select on public.discipline_catalog to authenticated;

-- Журнал: кроме собственной группы у старосты может быть доступ к группам из group_viewers.
create or replace view public.journal_entries
with (security_barrier = true) as
select
  s.id as submission_id,
  s.assignment_id,
  s.student_id,
  s.grade,
  s.status,
  s.submitted_at,
  s.updated_at
from public.submissions s
where s.student_id = auth.uid()
   or exists (
      select 1
      from public.assignments a
      where a.id = s.assignment_id
        and public.teacher_owns_discipline(a.discipline_id)
    )
   or s.student_id in (
      select p.id
      from public.profiles p
      where p.group_name = public.current_group()
        and p.role = 'student'
    )
   or exists (
      select 1
      from public.group_viewers gv
      where gv.user_id = auth.uid()
        and gv.group_name = (
          select sp.group_name
          from public.profiles sp
          where sp.id = s.student_id
            and sp.role = 'student'
        )
   );

revoke all on public.journal_entries from anon, authenticated;
grant select on public.journal_entries to authenticated;

notify pgrst, 'reload schema';
