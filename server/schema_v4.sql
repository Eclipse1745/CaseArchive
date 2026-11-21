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

