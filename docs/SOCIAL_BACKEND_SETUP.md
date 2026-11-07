# AstroSpace pilot accounts and social network

The /play client contains account, player-profile, friend-request, direct-message,
global-chat, planet-chat, region-chat and cloud-save adapters. The database migration is
provided at supabase/migrations/20261101143747_create_astrospace_social_and_player_saves.sql.

## Enable the service

1. Create or select a Supabase project dedicated to AstroSpace.
2. Apply the migration from the Supabase SQL editor or Supabase CLI.
3. Enable email authentication and configure the allowed redirect URL to
   https://<your-domain>/play/ (plus localhost while testing).
4. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to Vercel for Preview and Production.
5. Redeploy Vercel so the /api/auth-config function can expose the public project URL
   and publishable key to the client.

Do not add a service-role key to client-facing environment variables or the browser.
All public-schema tables in the migration have RLS enabled; the policies use each
authenticated player's auth.uid().

Until a dedicated Supabase project and these environment variables are configured, the
game continues with local browser saves. Login, cloud saves, live global chat, friend
search and DMs display a backend-unavailable state instead of pretending to be online.
