<div align="center">

# ⚔️ Zer0-Rank (not finished)

### Turn your Jellyfin watch history into an RPG experience

Climb **15 ranks** from Bronze to Demon King · Earn **Binge Bonus XP** for marathon sessions  
Compete on the **leaderboard** · **Prestige** when you reach the top

[![Java](https://img.shields.io/badge/Java-17+-orange?logo=openjdk)](https://adoptium.net/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-brightgreen?logo=springboot)](https://spring.io/projects/spring-boot)
[![SQLite](https://img.shields.io/badge/SQLite-3.44-blue?logo=sqlite)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-purple)](LICENSE)

> **Java port** of [Zer0JellyHub/Zer0-2-Rank](https://github.com/Zer0JellyHub/Zer0-2-Rank)  
> The UI injects **directly into Jellyfin** via `custom.js` — no separate browser tab needed.

</div>

---

## 📋 Table of Contents

- [How It Works](#-how-it-works)
- [Requirements](#-requirements)
- [Installation](#-installation)
  - [Step 1 – Backend (Java)](#step-1--backend-java)
  - [Step 2 – Frontend (Jellyfin JS Injection)](#step-2--frontend-jellyfin-js-injection)
- [Configuration](#-configuration)
- [Running the Backend](#-running-the-backend)
- [Using the Dashboard](#-using-the-dashboard)
- [API Reference](#-api-reference)
- [XP System](#-xp-system)
- [Binge Bonus](#-binge-bonus)
- [All 15 Ranks](#-all-15-ranks)
- [Anti-Cheat System](#-anti-cheat-system)
- [Prestige System](#-prestige-system)
- [Season System](#-season-system)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🔧 How It Works

Zer0-Rank has two parts:

```
┌─────────────────────────────────────────────────────────────┐
│  PART 1 – Java Backend  (Spring Boot, port 8765)            │
│                                                             │
│  • Reads playback_reporting.db directly via JDBC            │
│  • Calculates XP: watch time + completions + binge bonus    │
│  • Stores rank data in its own zer0rank.db                  │
│  • Exposes REST API  →  /WatchRanks/*                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PART 2 – custom.js  (injected into Jellyfin web UI)        │
│                                                             │
│  • Hooks into Jellyfin's built-in JS injection system       │
│  • Adds a "⚔️ Watch Ranks" button to the sidebar            │
│  • Shows your rank + XP badge in the top navigation bar     │
│  • Opens a full dashboard modal inside Jellyfin             │
│  • Shows animated rank-up popup when you rank up            │
│  • Refreshes your rank silently every 5 minutes             │
└─────────────────────────────────────────────────────────────┘
```

Everything appears **inside Jellyfin's own interface** — no separate browser tab, no extra login, no port forwarding needed for the UI.

---

## 📦 Requirements

| Requirement | Version | Notes |
|---|---|---|
| **Java JDK** | 17 or higher | [Download Adoptium](https://adoptium.net/) |
| **Apache Maven** | 3.8 or higher | [Download Maven](https://maven.apache.org/download.cgi) |
| **Jellyfin** | Any recent version | Must be running and accessible |
| **Playback Reporting Plugin** | Latest | [GitHub](https://github.com/jellyfin/jellyfin-plugin-playbackreporting) — must be installed in Jellyfin |

---

## 🚀 Installation

Installation has two independent parts: the **Java backend** and the **Jellyfin JS injection**.

---

### Step 1 — Backend (Java)

#### 1a. Install the Playback Reporting Plugin

1. Jellyfin → **Dashboard** → **Plugins** → **Catalog**
2. Search **"Playback Reporting"**, install it, restart Jellyfin
3. The plugin will write all watch sessions to `playback_reporting.db`

#### 1b. Create a Jellyfin API Key

1. Jellyfin → **Dashboard** → **Advanced** → **API Keys** → **+**
2. Name it `Zer0-Rank`, copy the key

#### 1c. Configure the backend

Edit `src/main/resources/application.properties`:

```properties
zer0rank.jellyfin-url=http://localhost:8096
zer0rank.jellyfin-api-key=YOUR_API_KEY_HERE
zer0rank.playback.db-path=/var/lib/jellyfin/data/playback_reporting.db
```

**Database path by OS:**

| OS | Path |
|---|---|
| **Linux** | `/var/lib/jellyfin/data/playback_reporting.db` |
| **Windows** | `C:/ProgramData/Jellyfin/Server/data/playback_reporting.db` |
| **macOS** | `~/.local/share/jellyfin/data/playback_reporting.db` |
| **Synology NAS** | `/volume1/@appdata/jellyfin/data/playback_reporting.db` |
| **Docker** | Wherever your Jellyfin data volume is mounted |

#### 1d. Build and run

**Linux / macOS:**
```bash
bash build.sh
```

**Windows:**
```bat
build.bat
```

**Manual:**
```bash
mvn clean package -DskipTests
java -jar target/zer0-rank-1.0.0.jar
```

The backend starts on `http://localhost:8765`. You should see a Spring Boot startup banner in the console.

---

### Step 2 — Frontend (Jellyfin JS Injection)

Jellyfin has a built-in **JavaScript injection system**. You simply drop `custom.js` into the right place and Jellyfin executes it on every page load — no plugin needed, no source code changes.

> **Edit `jellyfin-inject/custom.js` first** — find the `ZER0RANK_CONFIG` block at the top and set `apiBase` to where your Java backend is running (default: `http://localhost:8765`).

#### Option A — File system (recommended for full control)

Copy `custom.js` to your Jellyfin web directory:

| OS | Path |
|---|---|
| **Linux (apt/deb)** | `/usr/share/jellyfin/web/custom.js` |
| **Linux (tar)** | `/opt/jellyfin/jellyfin-web/custom.js` |
| **Windows** | `C:\Program Files\Jellyfin\Server\jellyfin-web\custom.js` |
| **macOS** | `/Applications/Jellyfin.app/Contents/Resources/jellyfin-web/custom.js` |
| **Synology NAS** | `/volume1/@appdata/jellyfin/jellyfin-web/custom.js` |
| **Docker** | Mount it as a volume — see below |

```bash
# Linux example
sudo cp jellyfin-inject/custom.js /usr/share/jellyfin/web/custom.js
```

No Jellyfin restart is required — just refresh the browser.

#### Option B — Jellyfin Dashboard (paste directly, no file access needed)

1. Jellyfin → **Dashboard** → **General** → scroll to **Custom JavaScript**
2. Paste the entire contents of `jellyfin-inject/custom.js` into the text box
3. Click **Save** — Jellyfin injects it immediately

> ⚠️ This method stores the script in Jellyfin's config database. It survives Jellyfin updates but is harder to manage than a file.

#### Option C — Docker

```yaml
# docker-compose.yml
services:
  jellyfin:
    image: jellyfin/jellyfin
    volumes:
      - ./jellyfin-inject/custom.js:/jellyfin/jellyfin-web/custom.js:ro
      - jellyfin-data:/config
```

Or with `docker run`:
```bash
docker run -d \
  -v "$(pwd)/jellyfin-inject/custom.js":/jellyfin/jellyfin-web/custom.js:ro \
  jellyfin/jellyfin
```

---

## ⚙️ Configuration

### Backend (`application.properties`)

```properties
# ── Connection ──────────────────────────────────────────────
zer0rank.jellyfin-url=http://localhost:8096
zer0rank.jellyfin-api-key=YOUR_KEY

# Full path to Playback Reporting database
zer0rank.playback.db-path=/var/lib/jellyfin/data/playback_reporting.db

# Port the backend listens on
server.port=8765

# ── Base XP ─────────────────────────────────────────────────
zer0rank.xp.per-minute=2                  # XP per real watch-minute
zer0rank.xp.per-episode=20               # Bonus per completed episode
zer0rank.xp.per-movie=20                 # Bonus per completed movie
zer0rank.xp.completion-threshold=0.80   # Min % watched to count as completed
zer0rank.xp.episode-min-watch-seconds=900   # Min 15 min for episode bonus
zer0rank.xp.movie-min-watch-seconds=2700   # Min 45 min for movie bonus

# ── Binge Bonus ─────────────────────────────────────────────
zer0rank.xp.binge-enabled=true
zer0rank.xp.binge-threshold-hours=3.0   # Hours of continuous watching needed
zer0rank.xp.binge-xp-bonus=500          # XP per qualifying binge day
zer0rank.xp.binge-gap-tolerance-seconds=600   # Gaps <= 10 min = still continuous

# ── Rank settings ────────────────────────────────────────────
zer0rank.ranks.prestige-enabled=true
zer0rank.ranks.show-leaderboard=true
zer0rank.ranks.season-carryover-rank=Platinum
```

### Frontend (`jellyfin-inject/custom.js` — top of file)

```javascript
const ZER0RANK_CONFIG = {
    // URL of your running Java backend
    apiBase: 'http://localhost:8765',

    // How often to silently refresh XP in the background (ms)
    refreshInterval: 300_000,   // 5 minutes

    // Show rank badge in the Jellyfin top nav bar
    showNavBadge: true,

    // Show animated rank-up popup when you rank up
    showRankupPopup: true,
};
```

---

## ▶️ Running the Backend

```bash
java -jar target/zer0-rank-1.0.0.jar
```

### As a systemd service (Linux)

Create `/etc/systemd/system/zer0rank.service`:

```ini
[Unit]
Description=Zer0-Rank Jellyfin Companion
After=network.target

[Service]
Type=simple
User=jellyfin
WorkingDirectory=/opt/zer0rank
ExecStart=java -jar /opt/zer0rank/zer0-rank-1.0.0.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now zer0rank
sudo systemctl status zer0rank
```

### With Docker

```bash
docker run -d \
  -p 8765:8765 \
  -v /var/lib/jellyfin/data:/jellyfin/data:ro \
  -e ZER0RANK_PLAYBACK_DB_PATH=/jellyfin/data/playback_reporting.db \
  -e ZER0RANK_JELLYFIN_API_KEY=YOUR_KEY \
  --name zer0rank \
  zer0rank
```

---

## 🖥️ Using the Dashboard

Once both parts are running:

1. **Open Jellyfin** in your browser as normal
2. In the **sidebar**, find the **"⚔️ Watch Ranks"** button
3. In the **top navigation bar**, you'll see your current rank badge (e.g. `🥇 Gold`)
4. Click either one to open the full dashboard **inside Jellyfin**

### Dashboard Tabs

| Tab | What you see |
|---|---|
| **My Rank** | Your rank icon, XP progress bar, binge day count, prestige badge, stats |
| **🏆 Leaderboard** | Every user ranked by prestige then XP — your row is highlighted |
| **📋 All Ranks** | All 15 ranks as cards showing achieved / current / locked |
| **🔥 XP Settings** | Live sliders for all XP values and binge bonus — save to backend without restart |

---

## 📡 API Reference

All endpoints on `http://localhost:8765`. Called by `custom.js` automatically, but also usable directly.

### User Endpoints

| Method | Endpoint | Description | Required Header |
|---|---|---|---|
| `GET` | `/WatchRanks/Me` | Your rank and XP progress | `X-User-Id: <id>` |
| `GET` | `/WatchRanks/User/{id}` | Any user's rank | — |
| `GET` | `/WatchRanks/Leaderboard` | Full server leaderboard | — |
| `GET` | `/WatchRanks/Ranks` | All 15 rank definitions | — |
| `POST` | `/WatchRanks/Prestige` | Prestige (requires Demon King) | `X-User-Id: <id>` |

### Admin Endpoints

> All admin endpoints require the header `X-Admin: true`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/WatchRanks/Config` | Current XP configuration |
| `POST` | `/WatchRanks/Config` | Update XP config at runtime |
| `GET` | `/WatchRanks/BingeStats/{id}` | Binge day count and total XP for a user |
| `POST` | `/WatchRanks/Season/Reset` | Trigger a season reset |
| `POST` | `/WatchRanks/Sync` | Force immediate XP sync from Playback Reporting |

### Example: Update XP config at runtime

```http
POST http://localhost:8765/WatchRanks/Config
X-Admin: true
Content-Type: application/json

{
  "xpPerMinute": 3,
  "bingeXpBonus": 1000,
  "bingeThresholdHours": 2.5
}
```

Only the fields you include are changed. All others stay as they are.

---

## ⚡ XP System

XP is recalculated every 10 minutes from the Playback Reporting database.

### 1. Watch-Time XP

```
XP = floor(PlayDuration_seconds / 60) × xpPerMinute
```

`PlayDuration` is the **actual seconds you watched** — not the total item length. Capped at `ItemDuration` to prevent exploits.

### 2. Completion Bonus

Per **distinct** item (episode or movie):

```
Episode  →  +xpPerEpisode   if played ≥ 80% AND ≥ 15 minutes
Movie    →  +xpPerMovie     if played ≥ 80% AND ≥ 45 minutes
```

Rewatching the same item gives no additional completion bonus.

### 3. Binge Bonus

See the [Binge Bonus](#-binge-bonus) section.

### Example

Watching 3 episodes (24 min each) back to back on an evening:

| Layer | Calculation | XP |
|---|---|---|
| Watch-time | 3 × 24 min × 2 XP/min | 144 XP |
| Completion | 3 × 20 XP | 60 XP |
| Binge | 72 min < 180 min threshold | 0 XP |
| **Total** | | **204 XP** |

---

## 🔥 Binge Bonus

Watch for 3+ hours in a row and earn bonus XP.

### How it triggers

Sessions in the same calendar day are merged if the gap between them is ≤ `bingeGapToleranceSeconds`:

```
21:00 ──── watch 45 min ──── 21:45
                │ 8-min gap (≤10 min tolerance → merged)
21:53 ──────────── watch 97 min ──────────────── 23:30

Merged block: 142 min → below 180 min threshold → no bonus
```

```
19:00 ── 60 min ─── 20:00
                │ 5 min gap ← merged
20:05 ── 60 min ─── 21:05
                │ 4 min gap ← merged
21:09 ── 66 min ─── 22:15

Merged block: 195 min = 3h 15min → threshold reached → +500 XP 🔥
```

### Rules

- Awarded **once per calendar day** — no matter how many qualifying blocks
- Gaps of ≤ `bingeGapToleranceSeconds` are bridged automatically
- A continuous block must reach `bingeThresholdHours` to count

---

## 🏅 All 15 Ranks

| # | Rank | Icon | XP Required | XP Gap |
|---|------|------|-------------|--------|
| 1 | Bronze | 🥉 | 0 | — |
| 2 | Silver | 🥈 | 50,000 | 50,000 |
| 3 | Gold | 🥇 | 150,000 | 100,000 |
| 4 | Platinum | 💠 | 350,000 | 200,000 |
| 5 | Ruby | ♦️ | 700,000 | 350,000 |
| 6 | Emerald | ❇️ | 1,200,000 | 500,000 |
| 7 | Obsidian | 🔮 | 2,000,000 | 800,000 |
| 8 | Mythril | ✨ | 3,500,000 | 1,500,000 |
| 9 | Adamant | 💎 | 4,500,000 | 1,000,000 |
| 10 | Grandmaster | 🌟 | 5,000,000 | 500,000 |
| 11 | King | 👑 | 5,400,000 | 400,000 |
| 12 | Legend | 🐦‍🔥 | 5,700,000 | 300,000 |
| 13 | Champion | 🏆 | 5,900,000 | 200,000 |
| 14 | God | ⚡ | 5,980,000 | 80,000 |
| 15 | Demon King | 😈 | 6,000,000 | 20,000 |

---

## 🛡️ Anti-Cheat System

| Protection | How It Works |
|---|---|
| **Real watch time** | Uses `PlayDuration` (actual seconds played), not `ItemDuration` |
| **Skip detection** | Skipping to the end gives only the XP for the seconds actually played |
| **Completion threshold** | Bonus requires ≥ 80% of item watched (configurable) |
| **Minimum watch time** | Episodes need ≥ 15 min, movies need ≥ 45 min |
| **Session capping** | Sessions are capped at item length — no XP inflation possible |
| **No rewatch bonus** | `DISTINCT ItemId` — same item can only give one completion bonus |
| **Binge is time-based** | Binge bonus checks actual wall-clock blocks, not just total XP |

---

## 😈 Prestige System

After reaching **Demon King (6,000,000 XP)**:

1. Click **Prestige** in the dashboard (or send `POST /WatchRanks/Prestige`)
2. XP resets to **0 (Bronze)**
3. Your prestige count increments (P1 → P2 → P3…)
4. The prestige badge shows permanently on the leaderboard

Disable via: `zer0rank.ranks.prestige-enabled=false`

---

## 🗓️ Season System

Admins trigger a season reset via `POST /WatchRanks/Season/Reset` (`X-Admin: true`).

| Rank at reset | What happens |
|---|---|
| Below Platinum (< 350,000 XP) | XP resets to 0 |
| Platinum or higher | XP is kept — rank carries over |

The carryover threshold is configurable: `zer0rank.ranks.season-carryover-rank=Platinum`

---

## 📁 Project Structure

```
zer0-rank/
│
├── pom.xml                           Maven build descriptor
├── build.sh / build.bat              Build scripts
├── README.md                         This file
│
├── jellyfin-inject/
│   ├── custom.js                     ← INJECT INTO JELLYFIN (see Installation Step 2)
│   │   Contains:
│   │   • ZER0RANK_CONFIG block       Configure apiBase here
│   │   • injectStyles()              All CSS injected at runtime
│   │   • injectSidebarButton()       Adds "⚔️ Watch Ranks" to Jellyfin sidebar
│   │   • injectNavBadge()            Adds rank badge to Jellyfin top bar
│   │   • openDashboard()             Renders the full modal UI
│   │   • loadMyRank()                Fetches and displays your rank + binge stats
│   │   • loadLeaderboard()           Renders leaderboard inside modal
│   │   • loadAllRanks()              Renders all 15 rank cards
│   │   • loadXpSettings()            Renders sliders + saves config to backend
│   │   • showRankupPopup()           Animated rank-up notification + particles
│   │   • backgroundRefresh()         Silent refresh every 5 min
│   │   • watchNavigation()           Re-injects buttons on SPA navigation
│   │
│   └── custom.css                    Optional (only needed for minor tweaks)
│
└── src/main/
    ├── resources/
    │   ├── application.properties    All backend configuration
    │   └── static/index.html         Standalone fallback web dashboard (backup only)
    │
    └── java/dev/zer0rank/
        ├── Zer0RankApplication.java  Spring Boot entry point
        ├── config/
        │   └── RankConfig.java       Typed config bean (Playback, Xp+Binge, Ranks)
        ├── model/
        │   ├── Rank.java             Enum: 15 ranks, XP thresholds, helpers
        │   ├── UserRank.java         JPA entity (SQLite: zer0rank.db)
        │   ├── UserRankRepository.java  Spring Data JPA repo + leaderboard query
        │   └── RankResponse.java     API DTO
        ├── service/
        │   ├── PlaybackReportingService.java  Reads playback_reporting.db via JDBC
        │   │                                  XP calculation + binge session detection
        │   ├── JellyfinApiService.java         Fetches usernames from Jellyfin REST API
        │   └── RankService.java               Business logic, @Scheduled sync, prestige, reset
        └── controller/
            ├── WatchRanksController.java       REST: Me, Leaderboard, Ranks, Prestige, Sync
            └── XpConfigController.java         REST: Config GET/POST, BingeStats
```

---

## 🔍 Troubleshooting

### Sidebar button / nav badge not appearing

Jellyfin uses a single-page application (SPA) — the DOM updates on navigation without a full page reload. `custom.js` hooks into Jellyfin's `viewshow` event to re-inject the buttons after each navigation. If buttons still don't appear:

1. Hard-refresh the page (`Ctrl+Shift+R`)
2. Check the browser console for errors — look for `[Zer0-Rank]` prefixed log lines
3. Confirm `custom.js` was actually loaded: in browser DevTools → Sources, search for `zer0rank`

---

### "Could not load rank data" in the dashboard

The `custom.js` frontend can't reach the Java backend. Check:

1. Is the backend actually running? `curl http://localhost:8765/WatchRanks/Ranks`
2. Is `apiBase` in `ZER0RANK_CONFIG` correct?
3. If Jellyfin runs on a different machine than the backend — make sure the backend is accessible from the browser (not just from the server). You may need to expose port 8765 or use a reverse proxy.
4. CORS is enabled (`@CrossOrigin(origins = "*")`) — should not be an issue.

---

### Rank shows "–" or no data

Your Jellyfin User ID hasn't been synced yet. Force a sync:
```http
POST http://localhost:8765/WatchRanks/Sync
X-Admin: true
```

The sync runs automatically 5 seconds after startup and then every 10 minutes.

---

### Binge bonus not triggering

Verify with the BingeStats endpoint:
```http
GET http://localhost:8765/WatchRanks/BingeStats/YOUR_USER_ID
```

Check that:
- `zer0rank.xp.binge-enabled=true`
- The merged session block on that day reaches the threshold
- Sessions aren't separated by gaps larger than `bingeGapToleranceSeconds`

---

### XP is 0 for a user who has been watching

1. **Plugin installed after watch history was created** — Playback Reporting only records from install time forward
2. **Wrong DB path** — double check `zer0rank.playback.db-path`
3. **File permissions** — the Java process must have read access to `playback_reporting.db`

---

### Config changes via API reset after restart

`POST /WatchRanks/Config` is in-memory only (by design — good for testing). To persist changes, update `application.properties` and restart.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.2 |
| REST | Spring MVC |
| Scheduling | Spring `@Scheduled` |
| ORM | Spring Data JPA + Hibernate |
| Rank DB | SQLite via `org.xerial:sqlite-jdbc` |
| Playback DB | Raw JDBC reads (no ORM overhead) |
| HTTP Client | `java.net.http.HttpClient` (Java 11+, zero extra deps) |
| JSON | Jackson |
| Build | Apache Maven |
| Frontend | `custom.js` — vanilla JS, injected into Jellyfin natively |

---

## 📄 License

AGPL-3.0 — same as the original [Zer0-2-Rank](https://github.com/Zer0JellyHub/Zer0-2-Rank) plugin.

---

<div align="center">Made with ❤️ for the Jellyfin community</div>
