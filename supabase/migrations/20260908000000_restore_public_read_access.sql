-- Restore public read access to blog + forum content.
--
-- Context: RLS/grants were tightened for security, which also removed anonymous
-- read access. Blog and forum content is meant to be world-readable; only the
-- writes need to be restricted. Symptoms observed before this migration:
--
--   table        anon SELECT
--   ---------    -----------------------------------------------
--   blog_posts   HTTP 200, [] .............. RLS, no SELECT policy
--   forums       HTTP 200, [] .............. RLS, no SELECT policy
--   posts        HTTP 200, [] .............. RLS, no SELECT policy
--   topics       HTTP 401, 42501 ........... missing table GRANT
--
-- The two failure modes are different and need different fixes. An empty array
-- means the GRANT is present but no permissive policy matched. "permission
-- denied for table" (42501) is a *table-level privilege* error raised before
-- RLS is ever consulted, so adding a policy to `topics` alone would not have
-- helped.
--
-- This migration is additive and idempotent: it does not drop or weaken any
-- INSERT/UPDATE/DELETE policy added during the security pass.

begin;

-- ---------------------------------------------------------------------------
-- 1. Table-level privileges (fixes the 42501 on `topics`)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on table
    public.blog_posts,
    public.forums,
    public.topics,
    public.posts,
    public.profiles
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Read policies. RLS stays enabled; each table gets one permissive SELECT
--    policy. Multiple permissive policies OR together, so these widen reads
--    without touching the write rules.
-- ---------------------------------------------------------------------------
alter table public.blog_posts enable row level security;
alter table public.forums     enable row level security;
alter table public.topics     enable row level security;
alter table public.posts      enable row level security;

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
    on public.blog_posts for select
    to anon, authenticated
    using (true);

drop policy if exists "forums_public_read" on public.forums;
create policy "forums_public_read"
    on public.forums for select
    to anon, authenticated
    using (true);

drop policy if exists "topics_public_read" on public.topics;
create policy "topics_public_read"
    on public.topics for select
    to anon, authenticated
    using (true);

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read"
    on public.posts for select
    to anon, authenticated
    using (true);

-- `profiles` already permits anonymous reads and is left as-is: the forum and
-- blog views embed profiles(username, avatar_url, is_admin) as the post author,
-- so revoking that read would blank out every author name and avatar.
-- See the note in the accompanying summary about narrowing this column set.

commit;
