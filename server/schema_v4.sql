-- Run once in the Supabase SQL editor (after schema_v3.sql), BEFORE deploying the new server.
-- Invite links are now one-time. The link carries an invite CODE, which is not a login. Opening the link
-- exchanges the code for a fresh session token (access_tokens) and marks the code as redeemed.
create table if not exists invites (
  code          text primary key,
  workspace_id  text not null,
  role          text not null check (role in ('Prosecutor','Court Clerk')),
  label         text not null,                 -- what the owner typed for their own reference
  invited_by    text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,          -- unused invites stop working after this
  redeemed_at   timestamptz                    -- set the moment the link is opened; null = still unused
);
create index if not exists invites_ws_idx on invites (workspace_id);
alter table invites enable row level security;  -- no policies: only the server can touch it

-- To cancel an unused invite: delete from invites where label = 'Prosecutor, Sharma case' and redeemed_at is null;
-- To cut off someone who already joined: delete from access_tokens where label = 'Prosecutor, Sharma case';
