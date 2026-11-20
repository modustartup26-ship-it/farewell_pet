-- 가족 방: 가족·함께 키우는 사람·임시가족(돌봄시설)이 짧은 영상(최대 10초)·사진을 실시간으로 나눈다.
-- 임시가족은 starts_at~ends_at 사이에만 읽고 올릴 수 있고, 맡기기 전 글은 can_history일 때만 본다.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  pet_name text not null check (char_length(pet_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  role text not null check (role in ('owner','family','co','temp')),
  rel text check (char_length(rel) <= 20),
  is_facility boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  can_today boolean not null default true,
  can_profile boolean not null default true,
  can_history boolean not null default false,
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  check (role <> 'temp' or (starts_at is not null and ends_at > starts_at))
);
create index family_members_user_idx on public.family_members(user_id);

create table public.family_invites (
  code text primary key check (code ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role text not null check (role in ('family','co','temp')),
  rel text check (char_length(rel) <= 20),
  facility_name text check (char_length(facility_name) <= 20),
  starts_at timestamptz,
  ends_at timestamptz,
  can_today boolean not null default true,
  can_profile boolean not null default true,
  can_history boolean not null default false,
  expires_at timestamptz not null default now() + interval '24 hours',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (role <> 'temp' or (facility_name is not null and starts_at is not null and ends_at > starts_at)),
  check (expires_at <= created_at + interval '7 days')
);
create index family_invites_family_idx on public.family_invites(family_id);

create table public.family_posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  kind text not null check (kind in ('photo','video')),
  storage_path text not null unique,
  duration_sec numeric(4,1) check (duration_sec between 0 and 10.5),
  tag text not null default '기타' check (char_length(tag) <= 10),
  caption text check (char_length(caption) <= 60),
  created_at timestamptz not null default now()
);
create index family_posts_family_created_idx on public.family_posts(family_id, created_at desc);
create index family_posts_author_idx on public.family_posts(author_id);

-- 판단 함수 (RLS에서 재귀 없이 쓰려고 security definer)
create function public.fam_role(fid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.family_members m
  where m.family_id = fid and m.user_id = (select auth.uid())
    and (m.role <> 'temp' or now() between m.starts_at and m.ends_at)
$$;

create function public.fam_can_see(fid uuid, created timestamptz) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = (select auth.uid())
      and (m.role <> 'temp' or (now() between m.starts_at and m.ends_at
           and (m.can_history or created between m.starts_at and m.ends_at))))
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_posts enable row level security;

create policy "members read family" on public.families for select to authenticated
  using (owner_id = (select auth.uid()) or public.fam_role(id) is not null);
create policy "owner renames family" on public.families for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "members read members" on public.family_members for select to authenticated
  using (user_id = (select auth.uid()) or public.fam_role(family_id) is not null);
create policy "owner updates members" on public.family_members for update to authenticated
  using (public.fam_role(family_id) = 'owner' and role <> 'owner')
  with check (public.fam_role(family_id) = 'owner' and role <> 'owner');
create policy "owner removes members or leave" on public.family_members for delete to authenticated
  using ((public.fam_role(family_id) = 'owner' and role <> 'owner') or (user_id = (select auth.uid()) and role <> 'owner'));

create policy "inviters read invites" on public.family_invites for select to authenticated
  using (public.fam_role(family_id) in ('owner','family'));
create policy "inviters create invites" on public.family_invites for insert to authenticated
  with check (created_by = (select auth.uid()) and used_by is null and public.fam_role(family_id) in ('owner','family'));
create policy "inviters cancel invites" on public.family_invites for delete to authenticated
  using (public.fam_role(family_id) in ('owner','family'));

create policy "members read posts" on public.family_posts for select to authenticated
  using (public.fam_can_see(family_id, created_at));
create policy "members post" on public.family_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.fam_role(family_id) is not null
              and storage_path like family_id::text || '/%');
create policy "author or owner deletes post" on public.family_posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.fam_role(family_id) = 'owner');

-- 내 가족 방 만들기 (보호자 한 명당 한 곳)
create function public.create_family(p_pet_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare fid uuid; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select id into fid from public.families where owner_id = uid;
  if fid is null then
    insert into public.families(owner_id, pet_name) values (uid, left(coalesce(nullif(trim(p_pet_name),''),'우리 아이'),40)) returning id into fid;
    insert into public.family_members(family_id, user_id, display_name, role, rel, color)
    values (fid, uid, left(coalesce(nullif(trim(p_display_name),''),'보호자'),20), 'owner', '보호자', '#1E56C2')
    on conflict do nothing;
  end if;
  return fid;
end $$;

-- 초대 코드로 들어가기
create function public.redeem_family_invite(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.family_invites; uid uuid := (select auth.uid()); n int;
  palette text[] := array['#E08A00','#2F8F5B','#C2456B','#6B4FC8','#0E8A9A','#1E56C2'];
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if char_length(trim(coalesce(p_display_name,''))) = 0 then raise exception 'name_required'; end if;
  select * into inv from public.family_invites where code = upper(trim(p_code)) for update;
  if inv.code is null or inv.used_by is not null or inv.expires_at < now() then raise exception 'invalid_code'; end if;
  if inv.role = 'temp' and inv.ends_at < now() then raise exception 'invalid_code'; end if;
  if exists (select 1 from public.family_members where family_id = inv.family_id and user_id = uid) then raise exception 'already_member'; end if;
  select count(*) into n from public.family_members where family_id = inv.family_id;
  insert into public.family_members(family_id, user_id, display_name, role, rel, is_facility, starts_at, ends_at, can_today, can_profile, can_history, color)
  values (inv.family_id, uid, left(trim(p_display_name),20), inv.role, inv.rel, inv.role = 'temp',
          inv.starts_at, inv.ends_at, inv.can_today, inv.can_profile, inv.can_history, palette[1 + n % 6]);
  update public.family_invites set used_by = uid, used_at = now() where code = inv.code;
  return inv.family_id;
end $$;

-- 가족 화면의 '지금 아이는'·돌봄 정보: 보호자 기록 중 필요한 것만 요약해서 준다
create function public.family_snapshot(fid uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.family_members; owner uuid; today date := (now() at time zone 'Asia/Seoul')::date; out jsonb := '{}'::jsonb; p jsonb;
begin
  select * into m from public.family_members where family_id = fid and user_id = (select auth.uid())
    and (role <> 'temp' or now() between starts_at and ends_at);
  if m.user_id is null then return null; end if;
  select f.owner_id into owner from public.families f where f.id = fid;
  if m.role <> 'temp' or m.can_today then
    out := out || jsonb_build_object('today', (
      select jsonb_build_object(
        'meal', max(log_time) filter (where type = 'meal'),
        'walk_min', coalesce(sum((data->>'min')::numeric) filter (where type = 'walk' and data->>'min' ~ '^[0-9.]+$'), 0),
        'poop', count(*) filter (where type = 'poop' and coalesce(data->>'kind','') <> '소변'))
      from public.daily_logs where guardian_id = owner and log_date = today));
  end if;
  if m.role <> 'temp' or m.can_profile then
    select pet into p from public.pet_profiles where user_id = owner;
    if p is not null then
      out := out || jsonb_build_object('pet', jsonb_build_object(
        'name', p->>'name', 'weight', p->>'weight', 'separation', p->>'separation',
        'medications', coalesce((select jsonb_agg(x->>'name') from jsonb_array_elements(case when jsonb_typeof(p->'medications') = 'array' then p->'medications' else '[]'::jsonb end) x where coalesce(x->>'name','') <> ''), '[]'::jsonb)));
    end if;
  end if;
  return out;
end $$;

revoke all on function public.fam_role(uuid), public.fam_can_see(uuid, timestamptz),
  public.create_family(text, text), public.redeem_family_invite(text, text), public.family_snapshot(uuid) from public, anon;
grant execute on function public.fam_role(uuid), public.fam_can_see(uuid, timestamptz),
  public.create_family(text, text), public.redeem_family_invite(text, text), public.family_snapshot(uuid) to authenticated;

alter publication supabase_realtime add table public.family_posts, public.family_members;

-- 파일: 비공개 버킷, 경로는 <family_id>/<파일>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-media', 'family-media', false, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

create policy "family members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'family-media'
    and public.fam_role(((storage.foldername(name))[1])::uuid) is not null);
create policy "family members read posted media" on storage.objects for select to authenticated
  using (bucket_id = 'family-media' and exists (select 1 from public.family_posts p where p.storage_path = name));
create policy "uploader or owner deletes media" on storage.objects for delete to authenticated
  using (bucket_id = 'family-media' and (owner_id = (select auth.uid())::text
    or public.fam_role(((storage.foldername(name))[1])::uuid) = 'owner'));
