-- ============================================================
-- Короткий текстовый ответ к заданию (до 150 символов).
-- Выполнить после 20260101000027_page_background_cover_transform.sql.
--
-- Задание можно сдать текстом без файла. Текст может дополнять файл.
-- RLS и триггер разрешают сдачу без файла только при непустом answer_text.
-- ============================================================

alter table public.submissions
  add column if not exists answer_text text;

alter table public.submissions
  drop constraint if exists submissions_answer_text_check;
alter table public.submissions
  add constraint submissions_answer_text_check
  check (answer_text is null or char_length(btrim(answer_text)) between 1 and 150);

drop policy if exists submissions_insert_own on public.submissions;
create policy submissions_insert_own on public.submissions
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and grade is null
    and status = 'submitted'
    and version = 1
    and (
      (
        file_path is not null
        and original_name is not null
        and size is not null
        and file_path like auth.uid()::text || '/' || assignment_id::text || '/%'
      )
      or (
        file_path is null
        and original_name is null
        and size is null
        and answer_text is not null
      )
    )
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.group_name = public.current_group()
    )
  );

drop policy if exists submissions_update_own on public.submissions;
create policy submissions_update_own on public.submissions
  for update to authenticated
  using (student_id = auth.uid() and grade is null)
  with check (
    student_id = auth.uid()
    and grade is null
    and status = 'submitted'
    and (
      (
        file_path is not null
        and original_name is not null
        and size is not null
        and file_path like auth.uid()::text || '/' || assignment_id::text || '/%'
      )
      or (
        file_path is null
        and original_name is null
        and size is null
        and answer_text is not null
      )
    )
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.group_name = public.current_group()
    )
  );

create or replace function public.guard_submission_update()
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
    raise exception 'Нельзя изменить студента у сдачи';
  end if;
  if new.assignment_id is distinct from old.assignment_id then
    raise exception 'Нельзя изменить задание у сдачи';
  end if;
  if new.grade is distinct from old.grade then
    raise exception 'Оценку выставляет только преподаватель';
  end if;
  if new.status <> 'submitted' then
    raise exception 'Нельзя изменить статус сдачи';
  end if;
  if new.file_path is not null
     and new.file_path not like old.student_id::text || '/' || old.assignment_id::text || '/%' then
    raise exception 'Некорректный путь файла';
  end if;

  if new.file_path is distinct from old.file_path then
    if new.file_path is null then
      raise exception 'Нельзя удалить файл из сдачи';
    end if;
    if new.version <> old.version + 1 then
      raise exception 'Номер версии должен увеличиваться на единицу';
    end if;
  elsif new.version <> old.version then
    raise exception 'Номер версии меняется только при загрузке файла';
  end if;

  if new.file_path is null and new.answer_text is null then
    raise exception 'Нужен файл или текст ответа';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_submission_update() from public;

drop trigger if exists submissions_guard_student_update on public.submissions;
create trigger submissions_guard_student_update
  before update on public.submissions
  for each row execute function public.guard_submission_update();

comment on column public.submissions.answer_text is
  'Короткий текстовый ответ студента (до 150 символов); может дополнять файл или заменять его.';
