-- JoyTo database schema (PostgreSQL 15+, compatible with Supabase).
-- Mirrors src/lib/types.ts one table per collection of the demo store.
-- Rule: every piece of information is stored once; derived data (seats left, statuses seen by
-- a companion, notification texts) is computed by queries or by the app, never stored.

create extension if not exists "pgcrypto";

create type user_role       as enum ('senior', 'companion', 'family');
create type category        as enum ('gardening', 'cooking', 'games', 'culture', 'walk', 'music', 'coffee');
create type outing_type     as enum ('activity', 'walk', 'errands', 'company');
create type sector_id       as enum ('gardens', 'centre', 'station', 'university');
create type relation_type   as enum ('son', 'daughter', 'grandchild', 'partner', 'friend', 'neighbour', 'other');
create type mission_status  as enum ('open', 'confirmed', 'done', 'cancelled');
create type offer_status    as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type payment_status  as enum ('authorized', 'captured', 'refunded');
create type booking_source  as enum ('assistant', 'manual', 'catalogue');

-- Profiles. With Supabase, id = auth.users.id: passwords live in Supabase Auth, never here.
create table profiles (
  id             uuid primary key default gen_random_uuid(),
  role           user_role not null,
  email          text not null unique,
  first_name     text not null,
  last_name      text not null,
  bio            text not null default '',
  sector         sector_id not null,
  interests      category[] not null default '{}',
  availability   text[] not null default '{}',          -- slots such as 'sat-pm'
  invite_code    text unique,                           -- seniors only, e.g. 'JOY-4821'
  locale         text not null default 'en' check (locale in ('en', 'fr')),
  created_at     timestamptz not null default now(),
  constraint invite_code_only_for_seniors check (invite_code is null or role = 'senior')
);

-- Companion-specific data (one row per companion).
create table companion_profiles (
  user_id        uuid primary key references profiles(id) on delete cascade,
  sectors        sector_id[] not null default '{}',
  verified       boolean not null default false,
  verified_at    timestamptz
);

-- Senior <-> relative. A senior can have several relatives and a relative several seniors.
create table family_links (
  id             uuid primary key default gen_random_uuid(),
  senior_id      uuid not null references profiles(id) on delete cascade,
  family_id      uuid not null references profiles(id) on delete cascade,
  relation       relation_type not null,
  created_at     timestamptz not null default now(),
  unique (senior_id, family_id)
);

create table activities (
  id             uuid primary key default gen_random_uuid(),
  title_en       text not null,
  title_fr       text not null,
  description_en text not null default '',
  description_fr text not null default '',
  category       category not null,
  starts_at      timestamptz not null,
  place          text not null,
  sector         sector_id not null,
  capacity       int not null check (capacity > 0),
  organizer      text not null,
  latitude       double precision,
  longitude      double precision
);

create table registrations (
  id             uuid primary key default gen_random_uuid(),
  activity_id    uuid not null references activities(id) on delete cascade,
  senior_id      uuid not null references profiles(id) on delete cascade,
  via            booking_source not null default 'catalogue',
  created_at     timestamptz not null default now(),
  unique (activity_id, senior_id)
);

-- Accompanied outings (paid).
create table missions (
  id             uuid primary key default gen_random_uuid(),
  senior_id      uuid not null references profiles(id),
  booked_by_id   uuid not null references profiles(id),
  payer_id       uuid not null references profiles(id),
  activity_id    uuid references activities(id),
  type           outing_type not null,
  note           text not null default '',
  starts_at      timestamptz not null,
  duration_min   int not null check (duration_min between 60 and 240),
  sector         sector_id not null,
  meeting_point  text not null,                         -- private: see policy below
  status         mission_status not null default 'open',
  via            booking_source not null default 'manual',
  cancel_reason  text,
  rating         int check (rating between 1 and 5),
  review         text,
  created_at     timestamptz not null default now()
);

create table offers (
  id             uuid primary key default gen_random_uuid(),
  mission_id     uuid not null references missions(id) on delete cascade,
  companion_id   uuid not null references profiles(id),
  status         offer_status not null default 'pending',
  created_at     timestamptz not null default now(),
  unique (mission_id, companion_id)
);
-- At most one accepted offer per outing.
create unique index one_accepted_offer on offers(mission_id) where status = 'accepted';

-- Amounts in cents. Real card data stays with the payment provider (for example Stripe).
create table payments (
  id                 uuid primary key default gen_random_uuid(),
  mission_id         uuid not null unique references missions(id),
  payer_id           uuid not null references profiles(id),
  amount_cents       int not null,
  gift_minutes       int not null default 0,
  card_cents         int not null,
  status             payment_status not null default 'authorized',
  provider_reference text,                              -- e.g. Stripe PaymentIntent id
  created_at         timestamptz not null default now()
);

create table gift_cards (
  id             uuid primary key default gen_random_uuid(),
  buyer_id       uuid not null references profiles(id),
  senior_id      uuid not null references profiles(id),
  minutes_total  int not null,
  minutes_left   int not null check (minutes_left >= 0),
  price_cents    int not null,
  created_at     timestamptz not null default now()
);

-- Notifications store a type and ids; the text is written by the app in the reader's language.
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  type           text not null,
  params         jsonb not null default '{}',
  href           text not null,
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index notifications_by_user on notifications(user_id, created_at desc);

create table chat_messages (
  id             uuid primary key default gen_random_uuid(),
  senior_id      uuid not null references profiles(id) on delete cascade,
  sender         text not null check (sender in ('user', 'ai')),
  text           text not null,
  payload        jsonb,                                 -- suggestions, draft, source
  created_at     timestamptz not null default now()
);

-- Progressive privacy: what a companion may read about an outing.
-- The exact meeting point and the senior's last name are only returned to the accepted companion.
create view missions_for_companions as
select
  m.id, m.type, m.note, m.starts_at, m.duration_min, m.sector, m.status, m.activity_id,
  p.first_name as senior_first_name,
  p.interests  as senior_interests,
  case when o.status = 'accepted' then p.last_name     end as senior_last_name,
  case when o.status = 'accepted' then m.meeting_point end as meeting_point
from missions m
join profiles p on p.id = m.senior_id
left join offers o on o.mission_id = m.id and o.companion_id = auth.uid();  -- auth.uid(): Supabase

-- Row-level security: enable it on every table, then add policies, for example:
alter table missions enable row level security;
create policy "senior side reads its outings" on missions for select using (
  auth.uid() in (senior_id, payer_id, booked_by_id)
  or exists (select 1 from family_links l where l.senior_id = missions.senior_id and l.family_id = auth.uid())
);
-- Companions never select from missions directly: they use missions_for_companions.
