-- 团队指标对比需要订单量，订单量和销量分开统计。
alter table public.products
  add column if not exists order_qty integer not null default 0;

alter table public.weekly_metric_snapshots
  add column if not exists order_count numeric not null default 0;

create or replace function public.rebuild_weekly_metric_snapshots_internal(p_batch_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.import_batches%rowtype;
begin
  select * into v_batch from public.import_batches where id = p_batch_id;
  if v_batch.id is null then
    raise exception '导入批次不存在';
  end if;

  delete from public.weekly_metric_snapshots where batch_id = p_batch_id;

  insert into public.weekly_metric_snapshots (
    batch_id, week_no, week_start, week_end, owner,
    listing_count, sales, order_count, revenue, net_sales, fba_avail, fba_unavail, refund_qty, order_gross_profit,
    impressions, clicks, ad_spend, ad_sales, ad_orders,
    ordered_listing_count, fba_listing_count, fba_unavail_listing_count,
    class_a_count, class_b_count, class_c_count, class_d_count, class_e_count,
    fba_value, show_value, needad_value, click_value, cvr_value, ad_invalid_value,
    low_slow_value, mid_slow_value, high_slow_value, age90_value, age180_value, age270_value
  )
  select
    p_batch_id, v_batch.week_no, v_batch.week_start, v_batch.week_end,
    coalesce(nullif(p.owner, ''), '未分配') as owner,
    count(*)::integer,
    coalesce(sum(p.sales), 0),
    coalesce(sum(p.order_qty), 0),
    coalesce(sum(p.revenue), 0),
    coalesce(sum(
      case
        when p.raw ? 'net_sales' and nullif(p.raw->>'net_sales', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (p.raw->>'net_sales')::numeric
        else p.revenue
      end
    ), 0),
    coalesce(sum(p.fba_avail), 0),
    coalesce(sum(p.fba_unavail), 0),
    coalesce(sum(p.refund_qty), 0),
    coalesce(sum(p.order_gross_profit), 0),
    coalesce(sum(p.imp), 0),
    coalesce(sum(p.clk), 0),
    coalesce(sum(p.ad_spend), 0),
    coalesce(sum(p.ad_rev), 0),
    coalesce(sum(p.ad_orders), 0),
    count(*) filter (where coalesce(p.sales, 0) > 0)::integer,
    count(*) filter (where coalesce(p.fba_avail, 0) > 0)::integer,
    count(*) filter (where coalesce(p.fba_unavail, 0) > 0)::integer,
    count(*) filter (where coalesce(p.sales, 0) >= 10)::integer,
    count(*) filter (where coalesce(p.sales, 0) >= 5 and coalesce(p.sales, 0) < 10)::integer,
    count(*) filter (where coalesce(p.sales, 0) >= 2 and coalesce(p.sales, 0) < 5)::integer,
    count(*) filter (where coalesce(p.sales, 0) >= 1 and coalesce(p.sales, 0) < 2)::integer,
    count(*) filter (where coalesce(p.sales, 0) <= 0)::integer,
    coalesce(sum(p.fba_value), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['show']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['needad']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['click']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['cvr']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['ad']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['sl_low']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['sl_mid']::text[]), 0),
    coalesce(sum(p.fba_value) filter (where coalesce(p.issue_keys, '{}'::text[]) @> array['sl_high']::text[]), 0),
    coalesce(sum(
      case when (coalesce(p.age_0_30,0)+coalesce(p.age_31_60,0)+coalesce(p.age_61_90,0)+coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0)) > 0
        then coalesce(p.fba_value,0) * (coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0))::numeric
          / (coalesce(p.age_0_30,0)+coalesce(p.age_31_60,0)+coalesce(p.age_61_90,0)+coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0))
        else 0 end
    ), 0),
    coalesce(sum(
      case when (coalesce(p.age_0_30,0)+coalesce(p.age_31_60,0)+coalesce(p.age_61_90,0)+coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0)) > 0
        then coalesce(p.fba_value,0) * (coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0))::numeric
          / (coalesce(p.age_0_30,0)+coalesce(p.age_31_60,0)+coalesce(p.age_61_90,0)+coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0))
        else 0 end
    ), 0),
    coalesce(sum(
      case when (coalesce(p.age_0_30,0)+coalesce(p.age_31_60,0)+coalesce(p.age_61_90,0)+coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0)) > 0
        then coalesce(p.fba_value,0) * (coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0))::numeric
          / (coalesce(p.age_0_30,0)+coalesce(p.age_31_60,0)+coalesce(p.age_61_90,0)+coalesce(p.age_91_180,0)+coalesce(p.age_181_270,0)+coalesce(p.age_271_330,0)+coalesce(p.age_331_365,0)+coalesce(p.age_365p,0))
        else 0 end
    ), 0)
  from public.products p
  where p.batch_id = p_batch_id
  group by coalesce(nullif(p.owner, ''), '未分配');
end;
$$;

revoke all on function public.rebuild_weekly_metric_snapshots_internal(bigint) from public;
revoke all on function public.rebuild_weekly_metric_snapshots_internal(bigint) from anon;
revoke all on function public.rebuild_weekly_metric_snapshots_internal(bigint) from authenticated;

do $$
declare
  v_batch_id bigint;
begin
  select id into v_batch_id from public.import_batches where is_current = true order by id desc limit 1;
  if v_batch_id is not null then
    perform public.rebuild_weekly_metric_snapshots_internal(v_batch_id);
  end if;
end;
$$;
