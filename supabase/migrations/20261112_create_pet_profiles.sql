create table public.pet_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pet jsonb not null check (jsonb_typeof(pet) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.pet_profiles enable row level security;
revoke all on public.pet_profiles from anon, authenticated;
grant select, insert, update on public.pet_profiles to authenticated;

create policy "users manage their own pet profile"
  on public.pet_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
