-- 수의사 상담 활동 등급(브론즈·실버·골드·다이아)과 보호자 평가
-- 등급은 상담 기록으로만 계산하고 돈으로 바꿀 수 없다. 개별 평가·상담은 공개하지 않고 집계값만 돌려준다.
create table public.vet_consult_feedback (
  consultation_id uuid primary key references public.vet_consultations(id) on delete cascade,
  guardian_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now()
);
create index vet_consult_feedback_guardian_idx on public.vet_consult_feedback(guardian_id);
alter table public.vet_consult_feedback enable row level security;
revoke all on public.vet_consult_feedback from anon, authenticated;
grant select on public.vet_consult_feedback to authenticated;
grant insert (consultation_id, helpful) on public.vet_consult_feedback to authenticated;
create policy "guardians read own feedback" on public.vet_consult_feedback for select to authenticated
  using (guardian_id = (select auth.uid()));
create policy "guardians rate answered consultations once" on public.vet_consult_feedback for insert to authenticated
  with check (guardian_id = (select auth.uid()) and exists (
    select 1 from public.vet_consultations c
    where c.id = consultation_id and c.guardian_id = (select auth.uid())
      and exists (select 1 from public.vet_consult_messages m where m.consultation_id = c.id and m.sender_id = c.veterinarian_id)));

create function public.vet_activity(p_vet uuid default null)
returns table (user_id uuid, answered int, reply_rate numeric, median_reply_minutes numeric, active_30d int,
  feedback_count int, helpful_rate numeric, tier text, score numeric)
language sql stable security definer set search_path = '' as $$
  with vets as (
    select p.user_id from public.veterinarian_profiles p
    where (p.is_listed or p.user_id = auth.uid()) and (p_vet is null or p.user_id = p_vet)
  ), firsts as (
    select c.id, c.veterinarian_id,
      (select min(m.created_at) from public.vet_consult_messages m where m.consultation_id = c.id and m.sender_id = c.guardian_id) as g_first
    from public.vet_consultations c join vets v on v.user_id = c.veterinarian_id
  ), replies as (
    select f.*, (select min(m.created_at) from public.vet_consult_messages m
      where m.consultation_id = f.id and m.sender_id = f.veterinarian_id and m.created_at >= f.g_first) as v_first
    from firsts f where f.g_first is not null
  ), agg as (
    select v.user_id,
      count(r.v_first)::int as answered,
      count(r.id) filter (where r.v_first is not null or r.g_first < now() - interval '24 hours')::int as eligible,
      count(r.id) filter (where r.v_first is not null and r.v_first - r.g_first <= interval '24 hours')::int as fast,
      percentile_cont(0.5) within group (order by extract(epoch from (r.v_first - r.g_first)) / 60) filter (where r.v_first is not null) as med,
      (select count(distinct m.consultation_id) from public.vet_consult_messages m join public.vet_consultations c on c.id = m.consultation_id
        where c.veterinarian_id = v.user_id and m.sender_id = v.user_id and m.created_at > now() - interval '30 days')::int as active,
      (select count(*) from public.vet_consult_feedback fb join public.vet_consultations c on c.id = fb.consultation_id where c.veterinarian_id = v.user_id)::int as fb_n,
      (select count(*) from public.vet_consult_feedback fb join public.vet_consultations c on c.id = fb.consultation_id where c.veterinarian_id = v.user_id and fb.helpful)::int as fb_yes
    from vets v left join replies r on r.veterinarian_id = v.user_id
    group by v.user_id
  ), calc as (
    select a.*,
      case when a.eligible > 0 then a.fast::numeric / a.eligible end as rate,
      case when a.fb_n > 0 then a.fb_yes::numeric / a.fb_n end as helpful
    from agg a
  )
  select c.user_id, c.answered, round(c.rate, 3), round(c.med::numeric, 1), c.active, c.fb_n, round(c.helpful, 3),
    case
      when c.answered < 3 then 'new'
      when c.answered >= 100 and c.rate >= 0.95 and c.med <= 60 and c.fb_n >= 20 and c.helpful >= 0.9 and c.active >= 5 then 'diamond'
      when c.answered >= 30 and c.rate >= 0.85 and c.med <= 120 and (c.fb_n < 5 or c.helpful >= 0.8) then 'gold'
      when c.answered >= 10 and c.rate >= 0.7 and c.med <= 360 then 'silver'
      else 'bronze' end,
    round((0.3 * (1 / (1 + coalesce(c.med, 1440) / 60))
      + 0.25 * ((coalesce(c.rate, 0) * c.eligible + 0.7 * 5) / (c.eligible + 5))
      + 0.35 * ((c.fb_yes + 0.8 * 5) / (c.fb_n + 5.0))
      + 0.1 * least(c.active / 10.0, 1))::numeric, 4)
  from calc c;
$$;
revoke all on function public.vet_activity(uuid) from public;
grant execute on function public.vet_activity(uuid) to anon, authenticated;
