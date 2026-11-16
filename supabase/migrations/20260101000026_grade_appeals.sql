-- ============================================================
-- Апелляция оценки
--
-- Студент просит пересмотреть выставленную оценку, преподаватель
-- принимает или отклоняет просьбу с комментарием. Апелляции хранятся
-- отдельно от сдач: оценку по-прежнему меняет только преподаватель.
--
-- Выполнить после 20260101000025_profile_cover_image.sql.
-- Миграция идемпотентна: её можно запускать повторно.
-- ============================================================

create table if not exists public.grade_appeals (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references public.submissions (id) on delete cascade,
  student_id      uuid not null references public.profiles (id) on delete cascade,
  message         text not null check (char_length(btrim(message)) between 5 and 1000),
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  teacher_comment text check (teacher_comment is null or char_length(teacher_comment) <= 1000),
  resolved_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists grade_appeals_submission_idx
  on public.grade_appeals (submission_id, created_at desc);

create index if not exists grade_appeals_student_idx
  on public.grade_appeals (student_id, created_at desc);

-- На одну работу может быть только одна апелляция «на рассмотрении».
create unique index if not exists grade_appeals_one_pending_idx
  on public.grade_appeals (submission_id)
  where status = 'pending';

alter table public.grade_appeals enable row level security;

-- Колоночные гранты: студент создаёт только текст просьбы, а менять может
-- лишь служебные поля (отзыв/решение). Подменить студента, работу или текст
-- через update нельзя.
revoke all on public.grade_appeals from anon, authenticated;
grant select on public.grade_appeals to authenticated;
grant insert (submission_id, student_id, message) on public.grade_appeals to authenticated;
grant update (status, teacher_comment, resolved_by, resolved_at)
  on public.grade_appeals to authenticated;

drop policy if exists grade_appeals_select on public.grade_appeals;
create policy grade_appeals_select on public.grade_appeals
  for select to authenticated
  using (public.is_admin() or student_id = auth.uid());

drop policy if exists grade_appeals_insert_own on public.grade_appeals;
create policy grade_appeals_insert_own on public.grade_appeals
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and status = 'pending'
    and teacher_comment is null
    and resolved_by is null
    and resolved_at is null
    and exists (
      select 1
      from public.submissions s
      where s.id = submission_id
        and s.student_id = auth.uid()
        and s.grade is not null
    )
    and not exists (
      select 1
      from public.grade_appeals g
      where g.submission_id = submission_id
        and g.status = 'pending'
    )
  );

drop policy if exists grade_appeals_cancel_own on public.grade_appeals;
create policy grade_appeals_cancel_own on public.grade_appeals
  for update to authenticated
  using (student_id = auth.uid() and status = 'pending')
  with check (
    student_id = auth.uid()
    and status = 'cancelled'
    and teacher_comment is null
    and resolved_by is null
  );

drop policy if exists grade_appeals_admin_update on public.grade_appeals;
create policy grade_appeals_admin_update on public.grade_appeals
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.grade_appeals is
  'Апелляции студентов на выставленные оценки: текст просьбы и решение преподавателя.';

notify pgrst, 'reload schema';
