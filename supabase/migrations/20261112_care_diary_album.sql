-- 돌봄 기록: 채팅 사진·영상, 입실/퇴실, 체크리스트, 서버 일기, 앨범 용량, 캘린더 구독, 주문 신청
-- 20261103_create_inquiry_chat.sql 다음에 실행한다.

-- 업체 종류 (일기 분류용)
alter table public.facilities add column if not exists category text not null default 'etc'
  check (category in ('hospital','hotel','kinder','grooming','etc'));
update public.facilities set category = 'hotel' where id = 'test-care';

-- 보호자 설정과 앨범 용량
create table public.guardian_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_diary boolean not null default true,
  quota_bytes bigint not null default 524288000 check (quota_bytes > 0),
  updated_at timestamptz not null default now()
);
alter table public.guardian_settings enable row level security;
revoke all on public.guardian_settings from anon, authenticated;
grant select on public.guardian_settings to authenticated;
create policy "users read own settings" on public.guardian_settings for select to authenticated
  using (user_id = (select auth.uid()));

-- 돌봄 체크리스트 계획: 보호자가 정하고 업체는 읽기만 한다
alter table public.conversations add column care_plan jsonb
  check (care_plan is null or (jsonb_typeof(care_plan) = 'object' and pg_column_size(care_plan) < 8000));

-- 사진·영상
create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  uploader_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  path text not null unique,
  kind text not null check (kind in ('image','video')),
  bytes bigint not null check (bytes > 0 and bytes <= 52428800),
  taken_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  caption text not null default '' check (char_length(caption) <= 200),
  counts_quota boolean not null default true,
  created_at timestamptz not null default now()
);
create index media_owner_idx on public.media(owner_id, taken_on desc);
create index media_conversation_idx on public.media(conversation_id, created_at);
create index media_uploader_idx on public.media(uploader_id);

-- 문의 메시지: messages라는 이름을 다른 테이블이 쓰고 있어 inquiry_messages로 새로 만든다
create table public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid default auth.uid() references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('guardian','facility')),
  kind text not null default 'text' check (kind in ('text','media','checkin','checkout','checklist')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) < 16000),
  created_at timestamptz not null default now()
);
create index inquiry_messages_conversation_idx on public.inquiry_messages(conversation_id, created_at);
create index inquiry_messages_sender_idx on public.inquiry_messages(sender_id);
alter table public.inquiry_messages enable row level security;
revoke all on public.inquiry_messages from anon, authenticated;
grant select on public.inquiry_messages to authenticated;
grant insert (conversation_id, sender_role, kind, body, payload) on public.inquiry_messages to authenticated;
create policy "participants read inquiry messages" on public.inquiry_messages for select to authenticated
  using (private.can_read_conversation(conversation_id));
create policy "participants send inquiry messages" on public.inquiry_messages for insert to authenticated
  with check (sender_id = (select auth.uid())
    and private.can_send_message(conversation_id, sender_role)
    and (kind in ('text','media') or sender_role = 'facility'));
create trigger inquiry_messages_touch_conversation after insert on public.inquiry_messages
  for each row execute function private.touch_conversation();

-- 서버 일기
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id text check (client_id is null or char_length(client_id) between 1 and 64),
  entry_date date not null,
  entry_time text not null default '' check (entry_time = '' or entry_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  place text not null check (char_length(place) between 1 and 60),
  place_id text check (place_id is null or char_length(place_id) <= 64),
  cat text not null default 'etc' check (cat in ('hospital','hotel','care','kindergarten','kinder','grooming','etc')),
  mood text not null default '' check (mood in ('great','ok','hard','')),
  body text not null default '' check (char_length(body) <= 2000),
  todos jsonb not null default '[]'::jsonb check (jsonb_typeof(todos) = 'array' and pg_column_size(todos) < 4000),
  activity jsonb not null default '{}'::jsonb check (jsonb_typeof(activity) = 'object' and pg_column_size(activity) < 2000),
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array' and pg_column_size(answers) < 12000),
  media_ids uuid[] not null default '{}' check (cardinality(media_ids) <= 10),
  source text not null default 'manual' check (source in ('manual','checkin','checkout','checklist')),
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid unique references public.inquiry_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guardian_id, client_id)
);
create index diary_entries_guardian_idx on public.diary_entries(guardian_id, entry_date desc);
create index diary_entries_conversation_idx on public.diary_entries(conversation_id);
alter table public.diary_entries enable row level security;
revoke all on public.diary_entries from anon, authenticated;
grant select, delete on public.diary_entries to authenticated;
grant insert (client_id, entry_date, entry_time, place, place_id, cat, mood, body, todos, activity, media_ids) on public.diary_entries to authenticated;
grant update (entry_date, entry_time, place, place_id, cat, mood, body, todos, activity, media_ids, updated_at) on public.diary_entries to authenticated;
create policy "guardians read own diary" on public.diary_entries for select to authenticated
  using (guardian_id = (select auth.uid()));
create policy "guardians write own diary" on public.diary_entries for insert to authenticated
  with check (guardian_id = (select auth.uid()) and source = 'manual');
create policy "guardians edit own manual diary" on public.diary_entries for update to authenticated
  using (guardian_id = (select auth.uid()) and source = 'manual')
  with check (guardian_id = (select auth.uid()) and source = 'manual');
create policy "guardians delete own diary" on public.diary_entries for delete to authenticated
  using (guardian_id = (select auth.uid()));

-- 일기에 붙인 사진은 내 사진만
create function private.check_diary_media()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if cardinality(new.media_ids) > 0 and exists (
    select 1 from unnest(new.media_ids) mid
    where not exists (select 1 from public.media m where m.id = mid and m.owner_id = new.guardian_id)
  ) then raise exception 'invalid_media'; end if;
  return new;
end;
$$;
create trigger diary_entries_check_media before insert or update on public.diary_entries
  for each row execute function private.check_diary_media();

-- 사진 메시지는 이 대화의 사진만 가리킬 수 있다
create function private.check_message_media()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'media' then
    if not exists (select 1 from public.media m
      where m.id = nullif(new.payload->>'media_id','')::uuid and m.conversation_id = new.conversation_id) then
      raise exception 'invalid_media';
    end if;
  end if;
  return new;
end;
$$;
create trigger inquiry_messages_check_media before insert on public.inquiry_messages
  for each row execute function private.check_message_media();

-- 업체 기록을 보호자 일기에 자동으로 옮긴다 (보호자가 끄면 건너뜀)
create function private.diary_from_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c record; f record; v_auto boolean; v_body text; v_local timestamp;
begin
  if new.kind not in ('checkin','checkout','checklist') then return new; end if;
  select * into c from public.conversations where id = new.conversation_id;
  select auto_diary into v_auto from public.guardian_settings where user_id = c.guardian_id;
  if v_auto is false then return new; end if;
  select * into f from public.facilities where id = c.facility_id;
  v_local := new.created_at at time zone 'Asia/Seoul';
  v_body := case new.kind
    when 'checkin' then '입실했어요.'
    when 'checkout' then '퇴실했어요.'
    else '돌봄 체크리스트가 도착했어요.' end;
  if coalesce(new.payload->>'note','') <> '' then v_body := v_body || E'\n' || left(new.payload->>'note', 500); end if;
  insert into public.diary_entries (guardian_id, entry_date, entry_time, place, place_id, cat, body, activity, answers, source, conversation_id, message_id)
  values (c.guardian_id, v_local::date, to_char(v_local, 'HH24:MI'), left(f.name, 60), f.id,
    case f.category when 'kinder' then 'kindergarten' else f.category end,
    v_body,
    case when jsonb_typeof(new.payload->'activity') = 'object' then new.payload->'activity' else '{}'::jsonb end,
    case when jsonb_typeof(new.payload->'answers') = 'array' then new.payload->'answers' else '[]'::jsonb end,
    new.kind, c.id, new.id);
  return new;
end;
$$;
create trigger inquiry_messages_to_diary after insert on public.inquiry_messages
  for each row execute function private.diary_from_message();

-- 앨범 용량
create function private.used_bytes(p_user uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(bytes), 0)::bigint from public.media where owner_id = p_user and counts_quota;
$$;

create function public.storage_usage()
returns table (used_bytes bigint, quota_bytes bigint) language sql stable security definer set search_path = '' as $$
  select private.used_bytes(auth.uid()),
    coalesce((select s.quota_bytes from public.guardian_settings s where s.user_id = auth.uid()), 524288000);
$$;

-- 업로드 자리를 먼저 만들고, 그 경로에만 파일을 올릴 수 있게 한다
create function public.create_media(p_conversation uuid, p_kind text, p_bytes bigint, p_ext text, p_caption text default '')
returns table (id uuid, path text) language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_owner uuid; v_counts boolean := true; v_id uuid := gen_random_uuid(); v_path text; v_quota bigint;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('image','video') then raise exception 'invalid_kind'; end if;
  if p_bytes is null or p_bytes <= 0 or p_bytes > 52428800 then raise exception 'file_too_large'; end if;
  if (p_kind = 'image' and p_ext not in ('jpg','png','webp')) or (p_kind = 'video' and p_ext not in ('mp4','mov','webm')) then
    raise exception 'invalid_type';
  end if;
  if p_conversation is null then
    v_owner := v_uid;
  else
    select c.guardian_id into v_owner from public.conversations c where c.id = p_conversation;
    if v_owner is null or not private.can_read_conversation(p_conversation) then raise exception 'not_allowed'; end if;
    -- 업체가 보낸 사진은 보호자 용량에서 빼지 않는다
    v_counts := (v_owner = v_uid);
  end if;
  if v_counts then
    v_quota := coalesce((select s.quota_bytes from public.guardian_settings s where s.user_id = v_owner), 524288000);
    if private.used_bytes(v_owner) + p_bytes > v_quota then raise exception 'quota_exceeded'; end if;
  end if;
  v_path := v_owner::text || '/' || v_id::text || '.' || p_ext;
  insert into public.media (id, owner_id, uploader_id, conversation_id, path, kind, bytes, caption, counts_quota)
  values (v_id, v_owner, v_uid, p_conversation, v_path, p_kind, p_bytes, left(coalesce(p_caption,''), 200), v_counts);
  return query select v_id, v_path;
end;
$$;

create function public.delete_media(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.media m where m.id = p_id and (m.owner_id = auth.uid() or m.uploader_id = auth.uid());
  if not found then raise exception 'not_allowed'; end if;
end;
$$;

alter table public.media enable row level security;
revoke all on public.media from anon, authenticated;
grant select on public.media to authenticated;
create policy "owners and participants read media" on public.media for select to authenticated
  using (owner_id = (select auth.uid())
    or (conversation_id is not null and private.can_read_conversation(conversation_id)));

-- 돌봄 체크리스트 계획 저장 (보호자만)
create function public.set_care_plan(p_conversation uuid, p_plan jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_count int; v_hours int;
begin
  if not exists (select 1 from public.conversations c where c.id = p_conversation and c.guardian_id = auth.uid()) then
    raise exception 'not_allowed';
  end if;
  if p_plan is not null then
    v_hours := (p_plan->>'interval_hours')::int;
    v_count := jsonb_array_length(p_plan->'questions');
    if v_hours is null or v_hours < 1 or v_hours > 12 or v_count < 1 or v_count > 12
      or exists (select 1 from jsonb_array_elements(p_plan->'questions') q
        where char_length(coalesce(q->>'q','')) not between 1 and 120
          or coalesce(q->>'type','') not in ('choice','text','minutes')) then
      raise exception 'invalid_plan';
    end if;
  end if;
  update public.conversations set care_plan = p_plan where id = p_conversation;
end;
$$;

-- 자동 기록 켜고 끄기
create function public.set_auto_diary(p_on boolean)
returns void language sql security definer set search_path = '' as $$
  insert into public.guardian_settings (user_id, auto_diary) values (auth.uid(), p_on)
  on conflict (user_id) do update set auto_diary = excluded.auto_diary, updated_at = now();
$$;

-- 캘린더 구독 링크 (토큰은 해시만 저장)
create table public.calendar_feeds (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;
revoke all on public.calendar_feeds from anon, authenticated;

create function public.issue_calendar_token()
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.calendar_feeds (user_id, token_hash) values (auth.uid(), encode(sha256(convert_to(v_token,'UTF8')),'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return v_token;
end;
$$;
create function public.revoke_calendar_token()
returns void language sql security definer set search_path = '' as $$
  delete from public.calendar_feeds where user_id = auth.uid();
$$;
create function public.has_calendar_token()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.calendar_feeds where user_id = auth.uid());
$$;

-- 용량 추가·포토북·생애 기록 신청 (결제 연동 전이라 신청만 받는다)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('storage','photobook','memorial')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 8000),
  status text not null default 'requested' check (status in ('requested','contacted','paid','in_production','shipped','cancelled')),
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant insert (kind, details) on public.orders to authenticated;
create policy "users read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy "users place own orders" on public.orders for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'requested');

revoke all on function public.storage_usage(), public.create_media(uuid,text,bigint,text,text), public.delete_media(uuid),
  public.set_care_plan(uuid,jsonb), public.set_auto_diary(boolean), public.issue_calendar_token(),
  public.revoke_calendar_token(), public.has_calendar_token() from public, anon;
grant execute on function public.storage_usage(), public.create_media(uuid,text,bigint,text,text), public.delete_media(uuid),
  public.set_care_plan(uuid,jsonb), public.set_auto_diary(boolean), public.issue_calendar_token(),
  public.revoke_calendar_token(), public.has_calendar_token() to authenticated;
revoke all on function private.check_diary_media(), private.check_message_media(), private.diary_from_message(), private.used_bytes(uuid) from public, anon, authenticated;

alter publication supabase_realtime add table public.inquiry_messages, public.diary_entries;

-- 파일 저장소: 비공개, 50MB 이하 사진·영상만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-media', 'pet-media', false, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

create policy "upload to reserved media path" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-media' and exists (
    select 1 from public.media m where m.path = name and m.uploader_id = (select auth.uid())));
create policy "read permitted media" on storage.objects for select to authenticated
  using (bucket_id = 'pet-media' and exists (
    select 1 from public.media m where m.path = name));
create policy "delete own media files" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-media' and exists (
    select 1 from public.media m where m.path = name and (m.owner_id = (select auth.uid()) or m.uploader_id = (select auth.uid()))));
