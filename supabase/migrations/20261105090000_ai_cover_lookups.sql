-- Rate limit for the analyze-cover Edge Function (AI cover auto-fill on the
-- sell / edit listing forms): each lookup inserts one row; the function refuses
-- more than 30 per user per hour. Only the service role (the function) touches
-- this table, so RLS is on with no policies.

begin;

create table if not exists public.ai_cover_lookups (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists ai_cover_lookups_user_created_idx
    on public.ai_cover_lookups (user_id, created_at desc);

alter table public.ai_cover_lookups enable row level security;
revoke all on table public.ai_cover_lookups from anon, authenticated;

-- Only the last hour matters; keep two days for troubleshooting.
select cron.schedule(
    'ai-cover-lookups-prune',
    '30 3 * * *',
    $$ delete from public.ai_cover_lookups where created_at < now() - interval '2 days'; $$
);

commit;
