-- 하루 기록: 밥·산책·배변·영양제·간식·놀이·물·사진 (daily.js)
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 64),
  type text not null check (type in ('meal','walk','poop','supp','snack','play','water','photo')),
  log_date date not null,
  log_time text not null default '' check (log_time = '' or log_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 16000),
  media_id uuid references public.media(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (guardian_id, client_id)
);
create index daily_logs_guardian_idx on public.daily_logs(guardian_id, log_date desc);
create index daily_logs_walk_idx on public.daily_logs(log_date) where type = 'walk';
create index daily_logs_media_idx on public.daily_logs(media_id);

alter table public.daily_logs enable row level security;
revoke all on public.daily_logs from anon, authenticated;
grant select, delete on public.daily_logs to authenticated;
grant insert (client_id, type, log_date, log_time, data, media_id) on public.daily_logs to authenticated;
grant update (client_id, type, log_date, log_time, data, media_id) on public.daily_logs to authenticated;

create policy "guardians read own daily logs" on public.daily_logs for select to authenticated using (guardian_id = (select auth.uid()));
create policy "guardians write own daily logs" on public.daily_logs for insert to authenticated
  with check (guardian_id = (select auth.uid()) and (media_id is null or exists (select 1 from public.media m where m.id = media_id and m.owner_id = (select auth.uid()))));
create policy "guardians edit own daily logs" on public.daily_logs for update to authenticated
  using (guardian_id = (select auth.uid()))
  with check (guardian_id = (select auth.uid()) and (media_id is null or exists (select 1 from public.media m where m.id = media_id and m.owner_id = (select auth.uid()))));
create policy "guardians delete own daily logs" on public.daily_logs for delete to authenticated using (guardian_id = (select auth.uid()));

-- 같은 체급 그룹(data.group) 보호자들의 최근 7일 하루 평균 산책 시간과 비교한 '상위 %'.
-- security definer는 다른 보호자 행을 세기 위해 필요하다. 개인 기록은 돌려주지 않고, 20명 미만이면 pct를 비워 화면이 추정치를 쓰게 한다.
create or replace function public.daily_walk_rank(p_group text, p_minutes numeric)
returns table (n integer, pct numeric)
language sql
stable
security definer
set search_path = public
as $$
  with per_guardian as (
    select guardian_id, sum((data->>'min')::numeric) / 7.0 as avg_min
    from public.daily_logs
    where type = 'walk'
      and data->>'group' = p_group
      and log_date > ((now() at time zone 'Asia/Seoul')::date - 7)
      and (data->>'min') ~ '^[0-9]+(\.[0-9]+)?$'
    group by guardian_id
  )
  select count(*)::integer as n,
         case when count(*) >= 20
              then round(100.0 * count(*) filter (where avg_min > p_minutes) / count(*), 1)
              end as pct
  from per_guardian;
$$;
revoke all on function public.daily_walk_rank(text, numeric) from public, anon;
grant execute on function public.daily_walk_rank(text, numeric) to authenticated;
