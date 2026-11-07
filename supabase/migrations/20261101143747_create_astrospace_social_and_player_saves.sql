create table if not exists public.player_saves (
 user_id uuid primary key references auth.users(id) on delete cascade,
 save_data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 constraint player_saves_data_object check (jsonb_typeof(save_data)='object')
);
alter table public.player_saves enable row level security;
revoke all on public.player_saves from anon;
grant select,insert,update on public.player_saves to authenticated;
create policy "players_read_own_save" on public.player_saves for select to authenticated using ((select auth.uid())=user_id);
create policy "players_create_own_save" on public.player_saves for insert to authenticated with check ((select auth.uid())=user_id);
create policy "players_update_own_save" on public.player_saves for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'ASTRO PILOT' check (length(display_name) between 2 and 24),
 avatar_url text,
 status text not null default 'online' check (status in ('online','away','offline')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select,insert,update on public.profiles to authenticated;
create policy "authenticated_can_view_profiles" on public.profiles for select to authenticated using ((select auth.uid()) is not null);
create policy "pilots_create_own_profile" on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy "pilots_update_own_profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);

create table if not exists public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 constraint friend_request_not_self check (sender_id<>recipient_id)
);
create unique index if not exists friend_requests_one_pending_pair on public.friend_requests(sender_id,recipient_id) where status='pending';
create index if not exists friend_requests_recipient_status on public.friend_requests(recipient_id,status,created_at desc);
alter table public.friend_requests enable row level security;
revoke all on public.friend_requests from anon;
grant select,insert on public.friend_requests to authenticated;
revoke update on public.friend_requests from authenticated;
grant update(status,responded_at) on public.friend_requests to authenticated;
create policy "request_participants_read" on public.friend_requests for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
create policy "pilots_send_own_requests" on public.friend_requests for insert to authenticated with check ((select auth.uid())=sender_id);
create policy "recipients_respond" on public.friend_requests for update to authenticated using ((select auth.uid())=recipient_id and status='pending') with check ((select auth.uid())=recipient_id and status in ('accepted','rejected'));
create table if not exists public.friendships (
 user_low uuid not null references public.profiles(id) on delete cascade,
 user_high uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_low,user_high),
 constraint friendship_order check(user_low<user_high)
);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon;
grant select,insert,delete on public.friendships to authenticated;
create policy "friends_read_own_relationships" on public.friendships for select to authenticated using ((select auth.uid()) in (user_low,user_high));
create policy "accepted_requests_create_friendship" on public.friendships for insert to authenticated with check (
 (select auth.uid()) in (user_low,user_high)
 and exists(select 1 from public.friend_requests r where r.status='accepted' and ((r.sender_id=user_low and r.recipient_id=user_high) or (r.sender_id=user_high and r.recipient_id=user_low)))
);
create policy "either_friend_remove_relationship" on public.friendships for delete to authenticated using ((select auth.uid()) in (user_low,user_high));

create table if not exists public.dm_conversations (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.dm_members (
 conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
alter table public.dm_conversations enable row level security;
alter table public.dm_members enable row level security;
revoke all on public.dm_conversations,public.dm_members from anon;
grant select,insert on public.dm_conversations to authenticated;
grant select,insert on public.dm_members to authenticated;
create policy "dm_members_read_conversations" on public.dm_conversations for select to authenticated using ((select auth.uid())=created_by or exists(select 1 from public.dm_members m where m.conversation_id=id and m.user_id=(select auth.uid())));
create policy "pilots_create_own_dm" on public.dm_conversations for insert to authenticated with check ((select auth.uid())=created_by);
create policy "dm_members_read_membership" on public.dm_members for select to authenticated using (user_id=(select auth.uid()));
create policy "dm_creator_adds_self_or_friend" on public.dm_members for insert to authenticated with check (
 exists(select 1 from public.dm_conversations c where c.id=conversation_id and c.created_by=(select auth.uid()))
 and (user_id=(select auth.uid()) or exists(select 1 from public.friendships f where (f.user_low=(select auth.uid()) and f.user_high=user_id) or (f.user_high=(select auth.uid()) and f.user_low=user_id)))
);

create table if not exists public.chat_messages (
 id bigint generated always as identity primary key,
 channel_key text not null check(length(channel_key) between 3 and 100),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check(length(content) between 1 and 1200),
 created_at timestamptz not null default now()
);
create index if not exists chat_messages_channel_created on public.chat_messages(channel_key,created_at desc);
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon;
grant select,insert on public.chat_messages to authenticated;
create policy "pilots_read_public_or_member_chat" on public.chat_messages for select to authenticated using (
 (channel_key='global/universe' or channel_key like 'planet/%' or channel_key like 'region/%')
 or (channel_key like 'dm/%' and exists(select 1 from public.dm_members m where m.conversation_id::text=substring(channel_key from 4) and m.user_id=(select auth.uid())))
);
create policy "pilots_write_own_public_or_member_chat" on public.chat_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and (
  channel_key='global/universe' or channel_key like 'planet/%' or channel_key like 'region/%'
  or (channel_key like 'dm/%' and exists(select 1 from public.dm_members m where m.conversation_id::text=substring(channel_key from 4) and m.user_id=(select auth.uid())))
 )
);
do $$ begin
 alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
