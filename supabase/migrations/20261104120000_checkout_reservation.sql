-- Checkout reservation: atomic stock handling for the Stripe webhook flow.
--
-- Context: before this migration, stock was taken from "comics-sell" when a
-- comic was added to the cart, using a stock value computed in the browser and
-- sent to /api/update-stock, and never given back for abandoned carts. Payment
-- was confirmed by the browser calling /api/confirm-payment (forgeable), and
-- every checkout created two orders. Live data on 2026-11-04: 159 orders,
-- 6 receipts (one order with two receipts), 9 cart rows holding stock.
--
-- After this migration:
--   * stock is reserved at checkout by reserve_order() (30 min hold),
--   * the stripe-webhook Edge Function calls mark_order_paid(),
--   * failed/expired payments call release_order() to give stock back.
-- The three functions run as SECURITY DEFINER and are callable only by
-- service_role (the Next.js admin client and Edge Functions).
--
-- NOT idempotent by design in section 4 (one-time data fix). Supabase records
-- applied migrations, so it runs once.

begin;

-- ---------------------------------------------------------------------------
-- 1. Order lifecycle columns
-- ---------------------------------------------------------------------------
alter table public.orders
    add column if not exists status                   text,
    add column if not exists stripe_payment_intent_id text,
    add column if not exists stock_reserved           boolean not null default false,
    add column if not exists expires_at               timestamptz,
    add column if not exists paid_at                  timestamptz;

-- Backfill: an order is "paid" only if a receipt exists for it. Everything else
-- was abandoned or a duplicate from the double create-order call.
update public.orders o
   set status = case when exists (select 1 from public.receipts r where r.order_id = o.id)
                     then 'paid' else 'expired' end
 where o.status is null;

alter table public.orders alter column status set default 'pending';
alter table public.orders alter column status set not null;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'refunded'));

create unique index if not exists orders_stripe_payment_intent_id_key
    on public.orders (stripe_payment_intent_id)
    where stripe_payment_intent_id is not null;

create index if not exists orders_pending_expiry_idx
    on public.orders (expires_at)
    where status = 'pending' and stock_reserved;

-- Totals are stored in major units (like "comics-sell".price). The integer type
-- truncated prices such as 499.99; numeric keeps the cents. Lossless for
-- existing integer values.
alter table public.orders   alter column total_amount type numeric(12, 2);
alter table public.receipts alter column total_amount type numeric(12, 2);

-- ---------------------------------------------------------------------------
-- 2. One receipt per order (idempotent receipt creation)
-- ---------------------------------------------------------------------------
-- Order 205 has two identical receipts; keep the earliest.
delete from public.receipts r
 using public.receipts keep
 where r.order_id = keep.order_id
   and r.id > keep.id;

alter table public.receipts drop constraint if exists receipts_order_id_key;
alter table public.receipts add constraint receipts_order_id_key unique (order_id);

-- ---------------------------------------------------------------------------
-- 3. Functions
-- ---------------------------------------------------------------------------

-- Reserve stock for every item and create a pending order, all or nothing.
-- p_items: [{ "comic_id": uuid, "quantity": int }, ...]
-- Prices and titles come from the database, never from the client.
-- Raises 'insufficient_stock:<comic_id>' when an item can't be reserved.
create or replace function public.reserve_order(p_user_id uuid, p_items jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
    v_item     jsonb;
    v_qty      integer;
    v_comic    public."comics-sell"%rowtype;
    v_total    numeric(12, 2) := 0;
    v_items    jsonb := '[]'::jsonb;
    v_username text;
    v_order    public.orders;
begin
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'empty_cart';
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

        v_total := v_total + v_comic.price * v_qty;
        -- Same item shape the receipt UI already renders.
        v_items := v_items || jsonb_build_object(
            'comicId',  v_comic.id,
            'title',    v_comic.title,
            'image',    v_comic.image,
            'price',    v_comic.price,
            'currency', v_comic.currency,
            'quantity', v_qty
        );
    end loop;

    select username into v_username from public.profiles where id = p_user_id;

    insert into public.orders (user_id, user_name, items, total_amount, currency,
                               status, stock_reserved, expires_at)
    values (p_user_id, v_username, v_items, v_total, 'usd',
            'pending', true, now() + interval '30 minutes')
    returning * into v_order;

    return v_order;
end;
$$;

-- Give reserved stock back and close a pending order.
-- Returns true if stock was released, false if there was nothing to do.
create or replace function public.release_order(p_order_id integer, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders;
    v_item  jsonb;
begin
    if p_status not in ('expired', 'cancelled') then
        raise exception 'invalid_release_status:%', p_status;
    end if;

    select * into v_order from public.orders
     where id = p_order_id and status = 'pending'
     for update;

    if not found then
        return false;
    end if;

    if v_order.stock_reserved then
        for v_item in select value from jsonb_array_elements(v_order.items) loop
            update public."comics-sell"
               set stock = stock + (v_item ->> 'quantity')::integer,
                   updated_at = now()
             where id = (v_item ->> 'comicId')::uuid;
        end loop;
    end if;

    update public.orders
       set status = p_status, stock_reserved = false, updated_at = now()
     where id = p_order_id;

    return v_order.stock_reserved;
end;
$$;

-- Mark an order paid from a Stripe payment_intent.succeeded event.
-- Idempotent. Returns:
--   'paid'          order marked paid, receipt created, cart cleared
--   'already_paid'  nothing to do (redelivered event)
--   'needs_refund'  stock was released and is gone; caller must refund
--   'unknown_order' no order for this PaymentIntent
create or replace function public.mark_order_paid(p_payment_intent_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders;
    v_item  jsonb;
begin
    select * into v_order from public.orders
     where stripe_payment_intent_id = p_payment_intent_id
     for update;

    if not found then
        return 'unknown_order';
    end if;

    if v_order.status = 'paid' then
        return 'already_paid';
    end if;

    if v_order.status = 'refunded' then
        return 'needs_refund';
    end if;

    -- Paid after the hold expired (or after a cancel): take the stock again.
    if v_order.status in ('expired', 'cancelled') then
        begin
            for v_item in select value from jsonb_array_elements(v_order.items) loop
                update public."comics-sell"
                   set stock = stock - (v_item ->> 'quantity')::integer,
                       updated_at = now()
                 where id = (v_item ->> 'comicId')::uuid
                   and stock >= (v_item ->> 'quantity')::integer;
                if not found then
                    raise exception 'restock_failed';
                end if;
            end loop;
        exception when others then
            -- The block's stock updates are rolled back; the buyer is refunded.
            update public.orders set status = 'refunded', updated_at = now()
             where id = v_order.id;
            return 'needs_refund';
        end;
    end if;

    update public.orders
       set status = 'paid', paid_at = now(), stock_reserved = false, updated_at = now()
     where id = v_order.id;

    insert into public.receipts (user_id, order_id, total_amount, currency, items, created_at)
    values (v_order.user_id, v_order.id, v_order.total_amount, v_order.currency, v_order.items, now())
    on conflict (order_id) do nothing;

    delete from public.cart
     where user_id = v_order.user_id
       and comic_id in (select (value ->> 'comicId')::uuid
                          from jsonb_array_elements(v_order.items));

    return 'paid';
end;
$$;

revoke all on function public.reserve_order(uuid, jsonb)     from public, anon, authenticated;
revoke all on function public.release_order(integer, text)   from public, anon, authenticated;
revoke all on function public.mark_order_paid(text)          from public, anon, authenticated;
grant execute on function public.reserve_order(uuid, jsonb)   to service_role;
grant execute on function public.release_order(integer, text) to service_role;
grant execute on function public.mark_order_paid(text)        to service_role;

-- ---------------------------------------------------------------------------
-- 4. One-time data fix: give back stock held by existing carts
-- ---------------------------------------------------------------------------
-- Add-to-cart no longer touches stock, so the quantities currently sitting in
-- carts must be returned. Verified on 2026-11-04 that those decrements stuck
-- (every cart row's comic had stock <= its cart snapshot).
update public."comics-sell" cs
   set stock = cs.stock + c.qty,
       updated_at = now()
  from (select comic_id, sum(quantity)::integer as qty
          from public.cart
         where comic_id is not null
         group by comic_id) c
 where cs.id = c.comic_id;

-- Refresh the cart's stock snapshot to match.
update public.cart c
   set stock = cs.stock
  from public."comics-sell" cs
 where cs.id = c.comic_id;

commit;
