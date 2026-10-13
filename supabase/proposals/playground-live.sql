create table public.la_poem_words (
 id bigint generated always as identity primary key,
 word text not null unique check (word ~ '^[가-힣]{3}$'),
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.la_poem_campaigns (
 id uuid primary key default gen_random_uuid(),
 word_id bigint not null references public.la_poem_words(id),
 word text not null check (word ~ '^[가-힣]{3}$'),
 starts_at timestamptz not null unique,
 writing_ends_at timestamptz not null,
 voting_ends_at timestamptz not null,
 finalized_at timestamptz,
 final_winners jsonb not null default '[]'::jsonb,
 check (starts_at < writing_ends_at and writing_ends_at < voting_ends_at),
 created_at timestamptz not null default now()
);
create table public.la_poems (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.la_poem_campaigns(id),
 author_id uuid not null references public.la_users(id),
 nickname text not null check (char_length(nickname) between 1 and 12),
 lines text[] not null check (cardinality(lines)=3 and array_lower(lines,1)=1 and array_position(lines,null) is null),
 request_id uuid not null,
 status text not null default 'visible' check (status in ('visible','hidden','deleted')),
 like_count integer not null default 0 check (like_count>=0),
 dislike_count integer not null default 0 check (dislike_count>=0),
 funny_count integer not null default 0 check (funny_count>=0),
 created_at timestamptz not null default now(),
 unique(author_id,request_id)
);
create table public.la_poem_reactions (
 poem_id uuid not null references public.la_poems(id) on delete cascade,
 user_id uuid not null references public.la_users(id),
 reaction text not null check (reaction in ('like','dislike','funny')),
 updated_at timestamptz not null default now(),
 primary key(poem_id,user_id)
);
create index la_poem_campaign_word_idx on public.la_poem_campaigns(word_id,starts_at desc);
create index la_poems_recent_idx on public.la_poems(campaign_id,created_at desc,id desc) where status='visible';
create index la_poems_popular_idx on public.la_poems(campaign_id,funny_count desc,created_at desc,id desc) where status='visible';
create index la_poems_campaign_fk_idx on public.la_poems(campaign_id);
create index la_poem_reactions_user_idx on public.la_poem_reactions(user_id);
alter table public.la_poem_words enable row level security;
alter table public.la_poem_campaigns enable row level security;
alter table public.la_poems enable row level security;
alter table public.la_poem_reactions enable row level security;
revoke all on public.la_poem_words,public.la_poem_campaigns,public.la_poems,public.la_poem_reactions from public,anon,authenticated;
grant all on public.la_poem_words,public.la_poem_campaigns,public.la_poems,public.la_poem_reactions to service_role;
grant usage,select on sequence public.la_poem_words_id_seq to service_role;

create function public.la_poem_count_reaction() returns trigger language plpgsql security invoker set search_path='' as $$
declare old_kind text; new_kind text; target uuid;
begin
 if tg_op<>'INSERT' then old_kind=old.reaction; target=old.poem_id; end if;
 if tg_op<>'DELETE' then new_kind=new.reaction; target=new.poem_id; end if;
 if tg_op='UPDATE' and (old.poem_id<>new.poem_id or old.user_id<>new.user_id) then raise exception 'IMMUTABLE_REACTION_KEY'; end if;
 update public.la_poems set
 like_count=like_count+(case when new_kind='like' then 1 else 0 end)-(case when old_kind='like' then 1 else 0 end),
 dislike_count=dislike_count+(case when new_kind='dislike' then 1 else 0 end)-(case when old_kind='dislike' then 1 else 0 end),
 funny_count=funny_count+(case when new_kind='funny' then 1 else 0 end)-(case when old_kind='funny' then 1 else 0 end)
 where id=target;
 return null;
end; $$;
create trigger la_poem_reaction_counts after insert or update or delete on public.la_poem_reactions for each row execute function public.la_poem_count_reaction();

create function public.la_submit_poem(p_user_id uuid,p_campaign_id uuid,p_nickname text,p_lines text[],p_request_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare campaign public.la_poem_campaigns; result uuid; i integer; day_start timestamptz;
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
 day_start=date_trunc('day',clock_timestamp() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 if (select count(*) from public.la_poems where author_id=p_user_id and created_at>=day_start)>=3 then raise exception 'DAILY_LIMIT_REACHED'; end if;
 insert into public.la_poems(campaign_id,author_id,nickname,lines,request_id) values(p_campaign_id,p_user_id,p_nickname,p_lines,p_request_id) returning id into result;
 return result;
end; $$;

create function public.la_set_poem_reaction(p_user_id uuid,p_poem_id uuid,p_reaction text)
returns void language plpgsql security invoker set search_path='' as $$
declare campaign public.la_poem_campaigns; poem public.la_poems;
begin
 perform 1 from public.la_users where id=p_user_id for update;
 if not found then raise exception 'USER_NOT_FOUND'; end if;
 select * into poem from public.la_poems where id=p_poem_id and status='visible';
 if not found then raise exception 'POEM_NOT_FOUND'; end if;
 if poem.author_id=p_user_id then raise exception 'SELF_REACTION_NOT_ALLOWED'; end if;
 select * into campaign from public.la_poem_campaigns where id=poem.campaign_id for share;
 if clock_timestamp()<campaign.starts_at or clock_timestamp()>=campaign.voting_ends_at or campaign.finalized_at is not null then raise exception 'VOTING_CLOSED'; end if;
 if p_reaction is null then delete from public.la_poem_reactions where poem_id=p_poem_id and user_id=p_user_id;
 else
  if p_reaction not in ('like','dislike','funny') then raise exception 'INVALID_REACTION'; end if;
  insert into public.la_poem_reactions(poem_id,user_id,reaction) values(p_poem_id,p_user_id,p_reaction)
  on conflict(poem_id,user_id) do update set reaction=excluded.reaction,updated_at=clock_timestamp();
 end if;
end; $$;

create function public.la_poem_maintain_week() returns uuid language plpgsql security invoker set search_path='' as $$
declare week_start timestamptz; chosen public.la_poem_words; campaign public.la_poem_campaigns; result uuid; winners jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('la_poem_maintain_week'));
 for campaign in select * from public.la_poem_campaigns where voting_ends_at<=clock_timestamp() and finalized_at is null for update loop
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'funny_count',funny_count) order by created_at,id),'[]'::jsonb) into winners
  from public.la_poems where campaign_id=campaign.id and status='visible' and funny_count>0
  and funny_count=(select max(funny_count) from public.la_poems where campaign_id=campaign.id and status='visible');
  update public.la_poem_campaigns set finalized_at=clock_timestamp(),final_winners=winners where id=campaign.id;
 end loop;
 week_start=(date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')+interval '9 hours') at time zone 'Asia/Seoul';
 if week_start>clock_timestamp() then week_start=week_start-interval '7 days'; end if;
 select id into result from public.la_poem_campaigns where starts_at=week_start;
 if result is not null then return result; end if;
 select w.* into chosen from public.la_poem_words w where enabled
 order by (select max(c.starts_at) from public.la_poem_campaigns c where c.word_id=w.id) asc nulls first,w.id limit 1;
 if chosen.id is null then return null; end if;
 insert into public.la_poem_campaigns(word_id,word,starts_at,writing_ends_at,voting_ends_at)
 values(chosen.id,chosen.word,week_start,week_start+interval '4 days',week_start+interval '7 days') returning id into result;
 return result;
end; $$;
revoke all on function public.la_poem_count_reaction(),public.la_submit_poem(uuid,uuid,text,text[],uuid),public.la_set_poem_reaction(uuid,uuid,text),public.la_poem_maintain_week() from public,anon,authenticated;
grant execute on function public.la_poem_count_reaction(),public.la_submit_poem(uuid,uuid,text,text[],uuid),public.la_set_poem_reaction(uuid,uuid,text),public.la_poem_maintain_week() to service_role;
-- One-time starter pool, drawn from the existing public school-meal menu sample.
insert into public.la_poem_words(word) values ('갈비탕'),('계란찜'),('국화빵'),('깍두기'),('꽃게탕'),('낙곱새'),('닭갈비'),('닭개장'),('닭곰탕'),('대구탕'),('단무지'),('겉절이');
select public.la_poem_maintain_week();
select cron.schedule('la-poem-weekly-maintenance','*/10 * * * *','select public.la_poem_maintain_week();');
