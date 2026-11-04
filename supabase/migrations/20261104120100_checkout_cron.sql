-- Scheduled checkout maintenance (pg_cron + pg_net).
--
-- Prerequisite (run once in the SQL editor; secrets are not committed):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the INTERNAL_HOOK_SECRET function secret>', 'internal_hook_secret');
--
-- Jobs:
--   checkout-maintenance  every 10 min  → Edge Function: expire unpaid holds,
--                                         settle payments whose webhook was missed
--   cart-snapshot-sync    nightly 03:00 → SQL only: refresh the cart's copies of
--                                         price/stock, drop rows for comics that
--                                         are gone or no longer approved

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper used by every job/trigger that calls an Edge Function.
-- SECURITY DEFINER so triggers fired by ordinary users can read the Vault.
create or replace function public.call_edge_function(p_name text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_url    text;
    v_secret text;
begin
    select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'project_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'internal_hook_secret';

    if v_url is null or v_secret is null then
        raise warning 'call_edge_function(%): vault secrets project_url / internal_hook_secret missing', p_name;
        return null;
    end if;

    -- Asynchronous: pg_net queues the request and returns its id immediately.
    return net.http_post(
        url     := v_url || '/functions/v1/' || p_name,
        body    := p_body,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-internal-secret', v_secret
        )
    );
end;
$$;

revoke all on function public.call_edge_function(text, jsonb) from public, anon, authenticated;

-- cron.schedule upserts by job name, so re-running this is safe.
select cron.schedule(
    'checkout-maintenance',
    '*/10 * * * *',
    $$ select public.call_edge_function('checkout-maintenance'); $$
);

select cron.schedule(
    'cart-snapshot-sync',
    '0 3 * * *',
    $$
    delete from public.cart c
     where not exists (select 1 from public."comics-sell" cs
                        where cs.id = c.comic_id and cs.is_approved);

    update public.cart c
       set price = cs.price,
           stock = cs.stock
      from public."comics-sell" cs
     where cs.id = c.comic_id
       and (c.price is distinct from cs.price or c.stock is distinct from cs.stock);
    $$
);

commit;
