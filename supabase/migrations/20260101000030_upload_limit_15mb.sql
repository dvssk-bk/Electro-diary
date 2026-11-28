-- ============================================================
-- Лимит загрузки работ снижен до 15 МБ, видео больше не принимается
-- Бакеты: submissions (работы) и extra_submissions (доп. задания)
-- ============================================================

do $$
declare
  allowed text[] := array[
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
    'image/png',
    'image/jpeg'
  ];
begin
  update storage.buckets
  set file_size_limit = 15728640, -- 15 МБ
      allowed_mime_types = allowed
  where id in ('submissions', 'extra_submissions');
end $$;
