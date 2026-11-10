create table public.veterinarian_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  clinic_name text not null check (char_length(btrim(clinic_name)) between 1 and 80),
  specialties jsonb not null check (
    jsonb_typeof(specialties) = 'array'
    and jsonb_array_length(specialties) between 1 and 8
  ),
  strengths text not null check (char_length(btrim(strengths)) between 2 and 300),
  bio text not null check (char_length(btrim(bio)) between 2 and 500),
  license_number text not null check (char_length(btrim(license_number)) between 3 and 40),
  estimated_wait_minutes integer not null default 10 check (estimated_wait_minutes between 0 and 1440),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.veterinarian_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  clinic_name text not null check (char_length(btrim(clinic_name)) between 1 and 80),
  specialties jsonb not null check (
    jsonb_typeof(specialties) = 'array'
    and jsonb_array_length(specialties) between 1 and 8
  ),
  strengths text not null check (char_length(btrim(strengths)) between 2 and 300),
  bio text not null check (char_length(btrim(bio)) between 2 and 500),
  estimated_wait_minutes integer not null default 10 check (estimated_wait_minutes between 0 and 1440),
  is_listed boolean not null default true,
  accepting_consultations boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.vet_consultations (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  veterinarian_id uuid not null references public.veterinarian_profiles(user_id) on delete cascade,
  pet_name text not null check (char_length(btrim(pet_name)) between 1 and 40),
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (guardian_id, veterinarian_id)
);

create index vet_consultations_guardian_idx
  on public.vet_consultations(guardian_id, last_message_at desc);
create index vet_consultations_veterinarian_idx
  on public.vet_consultations(veterinarian_id, last_message_at desc);

create table public.vet_consult_messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.vet_consultations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index vet_consult_messages_consultation_idx
  on public.vet_consult_messages(consultation_id, created_at);

create function private.can_read_vet_consultation(p_consultation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vet_consultations c
    where c.id = p_consultation_id
      and (c.guardian_id = auth.uid() or c.veterinarian_id = auth.uid())
  );
$$;

create function private.touch_vet_consultation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.vet_consultations
    set last_message = left(btrim(new.body), 120),
        last_message_at = new.created_at
    where id = new.consultation_id;
  return new;
end;
$$;
create trigger vet_messages_touch_consultation
  after insert on public.vet_consult_messages
  for each row execute function private.touch_vet_consultation();

create function private.sync_veterinarian_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' then
    insert into public.veterinarian_profiles (
      user_id, display_name, clinic_name, specialties, strengths, bio, estimated_wait_minutes
    ) values (
      new.user_id, btrim(new.display_name), btrim(new.clinic_name), new.specialties,
      btrim(new.strengths), btrim(new.bio), new.estimated_wait_minutes
    )
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      clinic_name = excluded.clinic_name,
      specialties = excluded.specialties,
      strengths = excluded.strengths,
      bio = excluded.bio,
      estimated_wait_minutes = excluded.estimated_wait_minutes,
      updated_at = now();
  elsif new.status = 'rejected' then
    delete from public.veterinarian_profiles where user_id = new.user_id;
  end if;
  return new;
end;
$$;
create trigger veterinarian_application_sync
  after update of display_name, clinic_name, specialties, strengths, bio,
    estimated_wait_minutes, status
  on public.veterinarian_applications
  for each row execute function private.sync_veterinarian_application();

revoke all on all functions in schema private from public, anon;
grant execute on function private.can_read_vet_consultation(uuid) to authenticated;

alter table public.veterinarian_applications enable row level security;
alter table public.veterinarian_profiles enable row level security;
alter table public.vet_consultations enable row level security;
alter table public.vet_consult_messages enable row level security;

revoke all on public.veterinarian_applications, public.veterinarian_profiles,
  public.vet_consultations, public.vet_consult_messages from anon, authenticated;

grant select on public.veterinarian_profiles to anon, authenticated;
grant select on public.veterinarian_applications to authenticated;
grant insert (user_id, display_name, clinic_name, specialties, strengths, bio,
  license_number, estimated_wait_minutes) on public.veterinarian_applications to authenticated;
grant update (display_name, clinic_name, specialties, strengths, bio,
  license_number, estimated_wait_minutes) on public.veterinarian_applications to authenticated;
grant update (display_name, clinic_name, specialties, strengths, bio,
  estimated_wait_minutes, accepting_consultations) on public.veterinarian_profiles to authenticated;
grant select on public.vet_consultations to authenticated;
grant insert (guardian_id, veterinarian_id, pet_name) on public.vet_consultations to authenticated;
grant select on public.vet_consult_messages to authenticated;
grant insert (consultation_id, body) on public.vet_consult_messages to authenticated;

create policy "listed veterinarians are public"
  on public.veterinarian_profiles for select to anon, authenticated
  using (is_listed or user_id = (select auth.uid()));
create policy "veterinarians update own profile"
  on public.veterinarian_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "veterinarians read own application"
  on public.veterinarian_applications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "veterinarians submit own application"
  on public.veterinarian_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "veterinarians update own application"
  on public.veterinarian_applications for update to authenticated
  using (user_id = (select auth.uid()) and status in ('pending','approved'))
  with check (user_id = (select auth.uid()) and status in ('pending','approved'));

create policy "consultation participants read consultation"
  on public.vet_consultations for select to authenticated
  using (guardian_id = (select auth.uid()) or veterinarian_id = (select auth.uid()));
create policy "guardians start consultations with available veterinarians"
  on public.vet_consultations for insert to authenticated
  with check (
    guardian_id = (select auth.uid())
    and exists (
      select 1 from public.veterinarian_profiles v
      where v.user_id = veterinarian_id
        and v.is_listed
        and v.accepting_consultations
    )
  );

create policy "consultation participants read messages"
  on public.vet_consult_messages for select to authenticated
  using (private.can_read_vet_consultation(consultation_id));
create policy "consultation participants send messages"
  on public.vet_consult_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.can_read_vet_consultation(consultation_id)
  );

alter publication supabase_realtime add table public.veterinarian_profiles,
  public.vet_consultations, public.vet_consult_messages;
