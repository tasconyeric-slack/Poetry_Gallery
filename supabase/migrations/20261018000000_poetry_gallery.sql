-- Apply only in a NEW, separate Supabase project for Poetry_Gallery.
create table public.poetry_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.poetry_owners enable row level security;
revoke all on public.poetry_owners from anon, authenticated;
grant select on public.poetry_owners to authenticated;
create policy "owner reads own membership" on public.poetry_owners
  for select to authenticated using (user_id = (select auth.uid()));

create table public.poems (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 30000),
  genre text not null default '其他' check (genre in ('五言','七言','词','其他')),
  note text check (note is null or length(note) <= 5000),
  composed_on date,
  status text not null default 'draft' check (status in ('draft','published')),
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint publication_timestamp_consistent check (
    (status = 'draft' and published_at is null) or
    (status = 'published' and published_at is not null)
  )
);
create index poems_public_idx on public.poems (published_at desc) where status = 'published';
create index poems_owner_idx on public.poems (owner_id, updated_at desc);
alter table public.poems enable row level security;
revoke all on public.poems from anon, authenticated;
grant select on public.poems to anon, authenticated;
grant insert, update, delete on public.poems to authenticated;
create policy "published visible to all" on public.poems
  for select to anon, authenticated using (status = 'published');
create policy "owner reads all works" on public.poems
  for select to authenticated using (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.poetry_owners o where o.user_id = (select auth.uid())
    )
  );
create policy "owner inserts" on public.poems
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.poetry_owners o where o.user_id = (select auth.uid())
    )
  );
create policy "owner updates" on public.poems
  for update to authenticated
  using (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.poetry_owners o where o.user_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.poetry_owners o where o.user_id = (select auth.uid())
    )
  );
create policy "owner deletes" on public.poems
  for delete to authenticated using (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.poetry_owners o where o.user_id = (select auth.uid())
    )
  );

create function public.poetry_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger poetry_updated before update on public.poems
  for each row execute function public.poetry_touch_updated_at();

-- Private bucket: no anonymous direct download.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poem-covers','poem-covers',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous users may mint signed links only while the poem is published.
create policy "published cover or owner read" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'poem-covers' and (
      exists (
        select 1 from public.poems p
        where p.cover_path = name and p.status = 'published'
      ) or (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (select 1 from public.poetry_owners o where o.user_id = (select auth.uid()))
      )
    )
  );
create policy "owner uploads cover" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'poem-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.poetry_owners o where o.user_id = (select auth.uid()))
    and exists (
      select 1 from public.poems p
      where p.id::text = (storage.foldername(name))[2] and p.owner_id = (select auth.uid())
    )
  );
create policy "owner removes cover" on storage.objects
  for delete to authenticated using (
    bucket_id = 'poem-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.poetry_owners o where o.user_id = (select auth.uid()))
  );
