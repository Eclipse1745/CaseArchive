-- Run once in the Supabase SQL editor (after schema_v2.sql), BEFORE deploying the new server.
-- Invitees now type their own name when they accept; the owner's typed name is kept as a private label.
alter table access_tokens add column if not exists label      text;         -- what the owner typed for their own reference
alter table access_tokens add column if not exists invited_by  text;         -- the owner's name when the invite was made
alter table access_tokens add column if not exists claimed_at  timestamptz;  -- set when the invitee confirms their own name (once)

-- Audit entries from invitees carry a note like "invited by SI Kabir · name not verified".
alter table audit_log add column if not exists actor_note text;

-- To revoke an invite later: delete from access_tokens where label = 'Prosecutor, Sharma case';
