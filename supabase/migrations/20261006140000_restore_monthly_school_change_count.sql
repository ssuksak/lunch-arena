-- Hotfix: the frontend still calls rpc('get_monthly_school_change_count') before every school change.
-- It was dropped in 20261006130000 together with its legacy table, which broke school changes
-- for users who already had a school. Restored exactly as it was (same table, same body), so the
-- behaviour matches pre-cleanup. FKs to the dropped legacy schools table are intentionally omitted.

create sequence if not exists public.user_school_changes_id_seq;

create table if not exists public.user_school_changes (
  id bigint not null default nextval('public.user_school_changes_id_seq'::regclass) primary key,
  user_key text not null,
  from_school_id bigint,
  to_school_id bigint,
  changed_at timestamp with time zone default now(),
  source text,
  ad_confirmed boolean not null default false,
  constraint user_school_changes_source_check check ((source is null) or (source = any (array['toss'::text, 'fp'::text])))
);
alter sequence public.user_school_changes_id_seq owned by public.user_school_changes.id;
create index if not exists idx_user_school_changes_user_key_at on public.user_school_changes using btree (user_key, changed_at desc);
alter table public.user_school_changes enable row level security;

create or replace function public.get_monthly_school_change_count(p_user_key text, p_month_start date default (date_trunc('month'::text, now()))::date)
 returns integer
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select count(*)::integer
  from public.user_school_changes
  where user_key = p_user_key
    and changed_at >= p_month_start::timestamptz
    and changed_at < (p_month_start::timestamptz + interval '1 month');
$function$;

grant execute on function public.get_monthly_school_change_count(text, date) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
