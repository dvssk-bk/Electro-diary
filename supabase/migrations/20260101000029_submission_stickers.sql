-- ============================================================
-- Стикеры-реакции на сдачу (эмодзи-оценка/поддержка).
-- Выполнить после 20260101000028_submission_answer_text.sql.
-- ============================================================

create table if not exists public.submission_stickers (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  teacher_id    uuid not null references public.profiles (id) on delete cascade,
  emoji         text not null check (char_length(btrim(emoji)) between 1 and 8),
  created_at    timestamptz not null default now()
);

create index if not exists submission_stickers_submission_idx
  on public.submission_stickers (submission_id, created_at);

comment on table public.submission_stickers is
  'Эмодзи-реакции преподавателя на сдачу: поддержка, похвала, замечание в мягком виде.';

drop policy if exists submission_stickers_select on public.submission_stickers;
create policy submission_stickers_select on public.submission_stickers
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.submissions s
      where s.id = submission_stickers.submission_id
        and (
          public.teacher_owns_submission(s.id)
          or s.student_id = auth.uid()
        )
    )
  );

drop policy if exists submission_stickers_insert on public.submission_stickers
  for insert to authenticated
  with check (
    public.is_admin()
    or public.teacher_owns_submission(submission_id)
  );

drop policy if exists submission_stickers_delete on public.submission_stickers
  for delete to authenticated
  using (
    public.is_admin()
    or public.teacher_owns_submission(submission_id)
  );

grant select, insert, delete on public.submission_stickers to authenticated;
