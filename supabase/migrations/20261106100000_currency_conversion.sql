-- Live currency conversion at checkout.
--
-- Context: reserve_order() (20261104120000_checkout_reservation.sql) added up
-- prices in different currencies and hard-coded the order currency to 'usd'.
-- Live order 214 on 2026-11-06: 300 SEK + 50 USD was about to be charged as
-- $350.00.
--
-- After this migration:
--   * exchange_rates holds European Central Bank rates (per 1 EUR), refreshed
--     twice a day by the sync-exchange-rates Edge Function (pg_cron below);
--   * reserve_order() takes the buyer's currency, converts every item on the
--     server, and records the rates it used on the order;
--   * called without a currency (the app deployed before this change), it
--     charges a single-currency cart in that currency and a mixed cart in USD,
--     converted, so the old bug stops as soon as this migration is applied.

begin;

-- ---------------------------------------------------------------------------
-- 1. Exchange rates
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_rates (
    currency   text primary key check (currency ~ '^[A-Z]{3}$'),
    per_eur    numeric(18, 8) not null check (per_eur > 0), -- units of this currency per 1 EUR
    rate_date  date not null,                                -- ECB publication date
    updated_at timestamptz not null default now()
);

-- Public data: the browser reads it to show converted prices. Only the
-- service role (the Edge Function) writes.
alter table public.exchange_rates enable row level security;

drop policy if exists "Exchange rates are public" on public.exchange_rates;
create policy "Exchange rates are public" on public.exchange_rates
    for select to anon, authenticated using (true);

grant select on public.exchange_rates to anon, authenticated;

-- Seed with the ECB rates of 2026-11-05 so conversion works before the first
-- sync. They count as stale after 5 days, so they can't linger unnoticed.
insert into public.exchange_rates (currency, per_eur, rate_date) values
    ('EUR', 1,        '2026-11-05'),
    ('USD', 1.1224,   '2026-11-05'),
    ('GBP', 0.83393,  '2026-11-05'),
    ('SEK', 10.9845,  '2026-11-05'),
    ('DKK', 7.4747,   '2026-11-05'),
    ('NOK', 10.4365,  '2026-11-05'),
    ('BRL', 6.1355,   '2026-11-05')
on conflict (currency) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Order columns
-- ---------------------------------------------------------------------------
-- Rates used for this order, only when something was converted:
-- {"SEK": {"per_eur": 10.9845, "date": "2026-11-05"}, "USD": {...}}
alter table public.orders add column if not exists fx_rates jsonb;

-- ---------------------------------------------------------------------------
-- 3. Conversion
-- ---------------------------------------------------------------------------
-- Converts one price, rounded to cents. The app's convertPrice()
-- (src/lib/currency.ts) uses the same formula for display.
-- Raises 'rates_unavailable:<currency>' when a rate is missing or older than
-- 5 days (the ECB skips weekends and holidays, so 1-4 days old is normal).
create or replace function public.convert_price(p_amount numeric, p_from text, p_to text)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
    v_from public.exchange_rates;
    v_to   public.exchange_rates;
begin
    if upper(p_from) = upper(p_to) then
        return round(p_amount, 2);
    end if;

    select * into v_from from public.exchange_rates where currency = upper(p_from);
    if not found or v_from.rate_date < current_date - 5 then
        raise exception 'rates_unavailable:%', upper(p_from);
    end if;

    select * into v_to from public.exchange_rates where currency = upper(p_to);
    if not found or v_to.rate_date < current_date - 5 then
        raise exception 'rates_unavailable:%', upper(p_to);
    end if;

    return round(p_amount / v_from.per_eur * v_to.per_eur, 2);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. reserve_order with a checkout currency
-- ---------------------------------------------------------------------------
-- Same contract as before (all or nothing, prices from the database, raises
-- 'insufficient_stock:<comic_id>'), plus:
--   p_currency  the buyer's currency; null → the cart's currency if it has only
--               one, else USD.
--   Each item keeps the seller's "price"/"currency" and gets "unitPrice" in the
--   order currency. total = sum(unitPrice * quantity).
drop function if exists public.reserve_order(uuid, jsonb);

create or replace function public.reserve_order(p_user_id uuid, p_items jsonb, p_currency text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
    v_currency text := upper(nullif(trim(p_currency), ''));
    v_item     jsonb;
    v_qty      integer;
    v_comic    public."comics-sell"%rowtype;
    v_from     text;
    v_unit     numeric(12, 2);
    v_total    numeric(12, 2) := 0;
    v_items    jsonb := '[]'::jsonb;
    v_rates    jsonb := '{}'::jsonb;
    v_rate     public.exchange_rates;
    v_username text;
    v_order    public.orders;
begin
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'empty_cart';
    end if;

    if v_currency is null then
        select case when count(distinct upper(coalesce(cs.currency, 'USD'))) = 1
                    then max(upper(coalesce(cs.currency, 'USD'))) end
          into v_currency
          from jsonb_array_elements(p_items) i
          join public."comics-sell" cs on cs.id = (i.value ->> 'comic_id')::uuid;
        v_currency := coalesce(v_currency, 'USD');
    end if;

    if v_currency not in ('USD', 'EUR', 'GBP', 'SEK', 'DKK', 'NOK', 'BRL') then
        raise exception 'unsupported_currency:%', v_currency;
    end if;

    for v_item in select value from jsonb_array_elements(p_items) loop
        v_qty := (v_item ->> 'quantity')::integer;
        if v_qty is null or v_qty < 1 then
            raise exception 'invalid_quantity';
        end if;

        update public."comics-sell"
           set stock = stock - v_qty,
               updated_at = now()
         where id = (v_item ->> 'comic_id')::uuid
           and is_approved
           and stock >= v_qty
        returning * into v_comic;

        if not found then
            raise exception 'insufficient_stock:%', v_item ->> 'comic_id';
        end if;

        v_from := upper(coalesce(v_comic.currency, 'USD'));
        -- Raises rates_unavailable → the whole reservation rolls back.
        v_unit := public.convert_price(v_comic.price, v_from, v_currency);
        v_total := v_total + v_unit * v_qty;

        if v_from <> v_currency then
            for v_rate in select * from public.exchange_rates where currency in (v_from, v_currency) loop
                v_rates := v_rates || jsonb_build_object(
                    v_rate.currency,
                    jsonb_build_object('per_eur', v_rate.per_eur, 'date', v_rate.rate_date)
                );
            end loop;
        end if;

        -- Same item shape the receipt UI already renders, plus unitPrice.
        v_items := v_items || jsonb_build_object(
            'comicId',   v_comic.id,
            'title',     v_comic.title,
            'image',     v_comic.image,
            'price',     v_comic.price,
            'currency',  v_from,
            'unitPrice', v_unit,
            'quantity',  v_qty
        );
    end loop;

    select username into v_username from public.profiles where id = p_user_id;

    insert into public.orders (user_id, user_name, items, total_amount, currency, fx_rates,
                               status, stock_reserved, expires_at)
    values (p_user_id, v_username, v_items, v_total, v_currency, nullif(v_rates, '{}'::jsonb),
            'pending', true, now() + interval '30 minutes')
    returning * into v_order;

    return v_order;
end;
$$;

revoke all on function public.reserve_order(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.reserve_order(uuid, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Schedule: refresh rates twice a day (the ECB publishes around 16:00 CET)
-- ---------------------------------------------------------------------------
select cron.schedule(
    'sync-exchange-rates',
    '30 15,21 * * *',
    $$ select public.call_edge_function('sync-exchange-rates'); $$
);

-- Fetch fresh rates right away (asynchronous; harmless if the function isn't
-- deployed yet: the seed above and the next scheduled run cover it).
select public.call_edge_function('sync-exchange-rates');

commit;
