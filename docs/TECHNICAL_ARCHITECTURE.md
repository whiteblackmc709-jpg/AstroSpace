# Technical architecture and platform responsibilities

## Platform boundaries

### Unreal Engine client and game servers
The future 3D game client owns rendering, input, animation, audio and local presentation. For multiplayer, authoritative dedicated servers own movement validation, interaction outcomes, combat resolution, event phases and shared world-state transitions. This repository does not yet contain an Unreal .uproject or a production server fleet.

### Supabase
Intended for account-linked persistent data: player profiles, character metadata, progression snapshots, quest flags, codex discoveries, inventory metadata and configuration records. Use Postgres transactions for durable writes and Row Level Security for exposed data. Do not expose service-role credentials in clients. High-frequency movement, combat ticks and physics simulation do not belong in ordinary database rows.

No AstroSpace Supabase database is changed by this commit. The connected account currently exposes other inactive projects; select or activate a dedicated AstroSpace project before applying a schema.

### Vercel
Hosts the project website and future companion web surfaces: account portal, codex browser, expedition journal, community portal and administrative tools. Functions can serve low-frequency HTTP APIs and webhooks. Vercel is not the authoritative real-time 3D simulation server.

### GitHub
Source control, pull requests, validation workflow and release history. Merge only after code/data validation and review of the deployment.

## Suggested data domains

- identity: player profile and platform links.
- characters: class, progression summary, equipped loadout.
- quest_progress: quest flags and objective state.
- discoveries: codex entries, scanned subjects and coordinates.
- planet_state: lifecycle phase, revision, discovery availability and event references.
- expedition_log: player-visible discovery timeline.
- inventory: item ownership and metadata.
- audit/ledger: durable currency and item transfers.

All player-owned records must be scoped to the authenticated player through Row Level Security. Economy and ownership mutations must be server-mediated and idempotent.

## Data flow

1. Unreal client authenticates and requests a short-lived game connection ticket.
2. A game backend validates the ticket and establishes the authoritative session.
3. Game server publishes persistent outcomes through trusted server APIs.
4. Supabase stores durable records; clients receive only user-authorized data.
5. Vercel serves the website and companion APIs from the same versioned source.
6. Event/telemetry pipelines are added only when the workload and budget justify them.

## Scaling principle

Start with one vertical slice and measure it. Do not build a 1,200-system or 100,000-concurrent-user architecture as if those targets are already achieved. Use profiling, load tests, service-level objectives and operational budgets to grow the architecture in evidence-backed stages.
