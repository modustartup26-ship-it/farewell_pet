-- 보호자 이용기록: 다녀온 보호자가 시설의 실제 돌봄 조건(체급·합사·투약 등)을 알려 준다.
-- 개인 답변은 본인만 보고, 다른 사람에게는 시설별 집계(몇 명이 어떤 답을 했는지)만 보여 준다.
create table public.place_reports (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 80),
  diary_client_id text not null check (char_length(diary_client_id) between 1 and 80),
  visited_on date not null,
  kind text not null check (kind in ('hospital','care','grooming')),
  size text check (size in ('소형견','중형견','대형견')),
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guardian_id, diary_client_id)
);
create index place_reports_place_idx on public.place_reports(place_id);

alter table public.place_reports enable row level security;
revoke all on public.place_reports from anon, authenticated;
grant select, delete on public.place_reports to authenticated;
grant insert (place_id, diary_client_id, visited_on, kind, size, answers) on public.place_reports to authenticated;
grant update (place_id, visited_on, kind, size, answers, updated_at) on public.place_reports to authenticated;
create policy "guardians read own reports" on public.place_reports for select to authenticated
  using (guardian_id = (select auth.uid()));
create policy "guardians add own reports" on public.place_reports for insert to authenticated
  with check (guardian_id = (select auth.uid()) and visited_on <= ((now() at time zone 'Asia/Seoul')::date));
create policy "guardians edit own reports" on public.place_reports for update to authenticated
  using (guardian_id = (select auth.uid()))
  with check (guardian_id = (select auth.uid()) and visited_on <= ((now() at time zone 'Asia/Seoul')::date));
create policy "guardians delete own reports" on public.place_reports for delete to authenticated
  using (guardian_id = (select auth.uid()));

-- 시설별 집계. 보호자마다 가장 최근 기록 하나만 센다. 누가 답했는지는 돌려주지 않는다.
create or replace function public.place_report_summaries(p_ids text[])
returns table (place_id text, guardians int, summary jsonb)
language sql stable security definer set search_path = '' as $$
  with latest as (
    select distinct on (r.guardian_id, r.place_id) r.place_id, r.guardian_id, r.size, r.answers
    from public.place_reports r
    where r.place_id = any (p_ids[1:300])
    order by r.guardian_id, r.place_id, r.visited_on desc, r.created_at desc
  ), kv as (
    select l.place_id, 'size'::text as k, l.size as v from latest l where l.size is not null
    union all
    select l.place_id, e.key, e.value #>> '{}' from latest l, jsonb_each(l.answers) e where jsonb_typeof(e.value) = 'string'
    union all
    select l.place_id, e.key, a.v from latest l, jsonb_each(l.answers) e,
      jsonb_array_elements_text(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) a(v)
  ), counts as (
    select kv.place_id, kv.k, kv.v, count(*)::int as n from kv where kv.v is not null and char_length(kv.v) <= 40 group by 1, 2, 3
  ), per_key as (
    select c.place_id, c.k, jsonb_object_agg(c.v, c.n) as o from counts c group by 1, 2
  )
  select g.place_id, g.guardians,
    coalesce((select jsonb_object_agg(pk.k, pk.o) from per_key pk where pk.place_id = g.place_id), '{}'::jsonb)
  from (select l.place_id, count(distinct l.guardian_id)::int as guardians from latest l group by 1) g;
$$;
revoke all on function public.place_report_summaries(text[]) from public;
grant execute on function public.place_report_summaries(text[]) to anon, authenticated;
