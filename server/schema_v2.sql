-- Run once in the Supabase SQL editor (after schema.sql).
-- Every user is now a token: it fixes WHICH workspace they can enter and WHICH role they have.
create table if not exists access_tokens (
  token         text primary key,
  workspace_id  text not null,
  role          text not null check (role in ('Investigator','Prosecutor','Court Clerk')),
  name          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists access_tokens_ws_idx on access_tokens (workspace_id);
alter table access_tokens enable row level security;  -- no policies: only the server can touch it

-- To revoke an invite later: delete from access_tokens where name = 'Adv. Sharma';
