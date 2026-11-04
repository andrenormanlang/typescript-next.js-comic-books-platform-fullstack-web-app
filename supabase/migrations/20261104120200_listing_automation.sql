-- Listing automation: database webhooks into Edge Functions.
--
--   "comics-sell" INSERT   → on-listing-created  (AI listing check + admin email)
--   storage.objects INSERT → on-image-uploaded   (thumbnail in <bucket>/thumbs/)
--
-- Uses public.call_edge_function() and the Vault secrets from
-- 20261104120100_checkout_cron.sql. Calls are async (pg_net), so a slow or
-- failing function never blocks or rolls back the user's insert.

begin;

alter table public."comics-sell"
    add column if not exists ai_review      jsonb,
    add column if not exists ai_reviewed_at timestamptz;

comment on column public."comics-sell".ai_review is
    'Advisory Gemini review from on-listing-created: {cover_matches_title, quality_flags[], suggested_description, confidence, model}. Never used to auto-approve.';

-- ---------------------------------------------------------------------------
-- New listing
-- ---------------------------------------------------------------------------
create or replace function public.notify_listing_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.call_edge_function('on-listing-created', jsonb_build_object('id', new.id));
    return new;
end;
$$;

drop trigger if exists on_listing_created on public."comics-sell";
create trigger on_listing_created
    after insert on public."comics-sell"
    for each row execute function public.notify_listing_created();

-- ---------------------------------------------------------------------------
-- New image in comics-images / avatars (thumbnails themselves are skipped,
-- so the function can't trigger itself)
-- ---------------------------------------------------------------------------
create or replace function public.notify_image_uploaded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.call_edge_function('on-image-uploaded', jsonb_build_object(
        'bucket',   new.bucket_id,
        'name',     new.name,
        'mimetype', new.metadata ->> 'mimetype',
        'size',     (new.metadata ->> 'size')::bigint
    ));
    return new;
end;
$$;

drop trigger if exists on_image_uploaded on storage.objects;
create trigger on_image_uploaded
    after insert on storage.objects
    for each row
    when (new.bucket_id in ('comics-images', 'avatars') and new.name not like 'thumbs/%')
    execute function public.notify_image_uploaded();

commit;
