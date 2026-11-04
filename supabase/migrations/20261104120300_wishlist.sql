-- Wishlist: buyers save comics they want without reserving stock.
-- Owner-only RLS; the Next.js /api/wishlist route uses the cookie-bound
-- session client, so these policies are what enforce access.

begin;

create table if not exists public.wishlist (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    comic_id   uuid not null references public."comics-sell" (id) on delete cascade,
    created_at timestamptz not null default now(),
    -- Set when a "back in stock" email was sent, so it is sent once per restock.
    notified_restock_at timestamptz,
    constraint wishlist_user_comic_key unique (user_id, comic_id)
);

create index if not exists wishlist_comic_id_idx on public.wishlist (comic_id);

alter table public.wishlist enable row level security;

grant select, insert, delete on table public.wishlist to authenticated;

drop policy if exists "wishlist_owner_select" on public.wishlist;
create policy "wishlist_owner_select"
    on public.wishlist for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "wishlist_owner_insert" on public.wishlist;
create policy "wishlist_owner_insert"
    on public.wishlist for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "wishlist_owner_delete" on public.wishlist;
create policy "wishlist_owner_delete"
    on public.wishlist for delete
    to authenticated
    using (auth.uid() = user_id);

commit;
