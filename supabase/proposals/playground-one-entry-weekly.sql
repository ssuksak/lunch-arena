-- One work per canonical user per weekly campaign, including hidden/deleted works.
-- No history is deleted or rewritten. Existing duplicates must be resolved explicitly.
create unique index la_poems_campaign_author_unique on public.la_poems(campaign_id,author_id);

create or replace function public.la_submit_poem(p_user_id uuid,p_campaign_id uuid,p_nickname text,p_lines text[],p_request_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare campaign public.la_poem_campaigns; result uuid; i integer;
begin
 perform 1 from public.la_users where id=p_user_id for update;
 if not found then raise exception 'USER_NOT_FOUND'; end if;
 select id into result from public.la_poems where author_id=p_user_id and request_id=p_request_id;
 if result is not null then return result; end if;
 select * into campaign from public.la_poem_campaigns where id=p_campaign_id for share;
 if not found or clock_timestamp()<campaign.starts_at or clock_timestamp()>=campaign.writing_ends_at then raise exception 'WRITING_CLOSED'; end if;
 if cardinality(p_lines) is distinct from 3 or array_lower(p_lines,1) is distinct from 1 then raise exception 'INVALID_LINES'; end if;
 for i in 1..3 loop
  if p_lines[i] is null or char_length(p_lines[i]) not between 2 and 60 or p_lines[i]<>btrim(p_lines[i]) or p_lines[i] ~ E'[\n\r]' or left(p_lines[i],1)<>substring(campaign.word from i for 1) then raise exception 'INVALID_LINES'; end if;
 end loop;
 if exists(select 1 from public.la_poems where author_id=p_user_id and campaign_id=p_campaign_id) then raise exception 'ALREADY_PARTICIPATED'; end if;
 insert into public.la_poems(campaign_id,author_id,nickname,lines,request_id) values(p_campaign_id,p_user_id,p_nickname,p_lines,p_request_id) returning id into result;
 return result;
end; $$;

-- Monday 09:00 KST = Monday 00:00 UTC. Ranking is computed on feed reads.
select cron.schedule('la-poem-weekly-maintenance','0 0 * * 1','select public.la_poem_maintain_week();');
