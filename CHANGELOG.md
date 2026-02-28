# Changelog

All notable changes to this project will be documented here.

## [1.0.0] - 2024

### Added
- Initial Java port of [Zer0-2-Rank](https://github.com/Zer0JellyHub/Zer0-2-Rank) (originally C#)
- Spring Boot 3.2 backend with embedded SQLite database
- 15 ranks from Bronze to Demon King with XP thresholds
- Watch-time XP based on real `PlayDuration` (anti-cheat)
- Completion bonuses for episodes and movies
- **Binge Bonus system** — XP for continuous multi-hour watch sessions
- Live XP config via `POST /WatchRanks/Config` — no restart needed
- Prestige system — reset at Demon King, keep your prestige badge
- Season reset with configurable rank carryover
- Leaderboard sorted by prestige then XP
- **Jellyfin JS injection** — full dashboard injected natively into Jellyfin UI via `custom.js`
  - Auto-detects user from Jellyfin's built-in `ApiClient`
  - Sidebar "⚔️ Watch Ranks" button
  - Top navigation rank badge
  - Full modal dashboard with 4 tabs
  - Animated rank-up popup with particle effects
  - Silent background refresh every 5 minutes
  - Handles Jellyfin SPA navigation (`viewshow` event)
- Standalone fallback web dashboard at `http://localhost:8765`
- REST API compatible with original C# plugin endpoints

### Anti-Cheat
- XP from `PlayDuration` only (not `ItemDuration`)
- Session capped at item duration
- Completion threshold (default 80%)
- Minimum watch time for bonuses
- `DISTINCT ItemId` for completion bonuses (no rewatch farming)
