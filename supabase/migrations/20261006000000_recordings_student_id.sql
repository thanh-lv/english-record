-- Link each recording to the student's profile instead of matching by student_name.
--
-- Matching by name mixed up recordings of classmates sharing a name, attached the
-- recordings of a deleted student to a new student with the same name, and treated
-- `%` / `_` in names as ILIKE wildcards.
--
-- The app keeps working before this migration runs (it falls back to name matching),
-- but new recordings are only attributed by id once the column exists.
-- Safe to run more than once.

alter table public.recordings
  add column if not exists student_id uuid references public.profiles (id) on delete set null;

create index if not exists recordings_student_id_idx on public.recordings (student_id);

-- Backfill existing rows. A recording is attributed only when exactly one student
-- profile of the same teacher has that name (trimmed, case-insensitive). Ambiguous
-- rows stay NULL so they are not shown to the wrong student; teachers still see them
-- on the recordings page, which groups submissions by name.
update public.recordings r
set student_id = m.student_id
from (
  select rec.id as recording_id, (array_agg(p.id))[1] as student_id
  from public.recordings rec
  join public.profiles p
    on p.role = 'student'
   and lower(trim(p.name)) = lower(trim(rec.student_name))
   and p.teacher_id is not distinct from rec.teacher_id
  where rec.student_id is null
  group by rec.id
  having count(*) = 1
) m
where r.id = m.recording_id;
