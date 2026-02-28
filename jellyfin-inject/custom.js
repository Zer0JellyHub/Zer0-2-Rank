/**
 * ============================================================
 *  Zer0-Rank  —  Jellyfin custom.js injection
 *  
 *  Injects the full Zer0-Rank UI directly into Jellyfin's
 *  web interface. No separate browser tab needed.
 *
 *  HOW TO INSTALL:
 *    Copy this file to your Jellyfin web directory:
 *      Linux:   /usr/share/jellyfin/web/custom.js
 *      Windows: C:\Program Files\Jellyfin\Server\jellyfin-web\custom.js
 *      Docker:  mount as volume → /jellyfin/jellyfin-web/custom.js
 *
 *    OR paste the contents into:
 *      Jellyfin Dashboard → General → Custom JavaScript
 *
 *  CONFIGURATION (edit the block below):
 * ============================================================
 */

const ZER0RANK_CONFIG = {
    // URL of your running Zer0-Rank Java backend
    apiBase: 'http://localhost:8765',

    // How often to refresh XP in the background (milliseconds)
    refreshInterval: 300_000,   // 5 minutes

    // Show the rank badge in the top navigation bar
    showNavBadge: true,

    // Show rank-up popup with particle animation
    showRankupPopup: true,
};

/* ============================================================
   Everything below is auto-injected — no need to edit
   ============================================================ */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────
    let _userId   = null;
    let _userData = null;
    let _lastRank = localStorage.getItem('zer0rank_lastRank') || null;
    let _config   = null;

    // ── Rank colour map ───────────────────────────────────────
    const RANK_COLORS = {
        'Bronze':'#cd7f32','Silver':'#c0c0c0','Gold':'#ffd700',
        'Platinum':'#00d4ff','Ruby':'#e53935','Emerald':'#00c853',
        'Obsidian':'#aa00ff','Mythril':'#40c4ff','Adamant':'#00bcd4',
        'Grandmaster':'#ffd740','King':'#ffab40','Legend':'#ff6d00',
        'Champion':'#d500f9','God':'#ffff00','Demon King':'#f44336',
    };

    // ── Wait for Jellyfin to finish loading ───────────────────
    function waitForJellyfin(cb, tries = 0) {
        // ApiClient is Jellyfin's built-in JS client
        if (window.ApiClient && ApiClient.getCurrentUserId()) {
            cb();
        } else if (tries < 60) {
            setTimeout(() => waitForJellyfin(cb, tries + 1), 500);
        } else {
            console.warn('[Zer0-Rank] Timed out waiting for Jellyfin ApiClient.');
        }
    }

    // ── Inject global styles ──────────────────────────────────
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'zer0rank-styles';
        style.textContent = `
        /* ── Variables ─────────────────────────── */
        :root {
            --zr-bg:      #0f0f17;
            --zr-surface: #1a1a2e;
            --zr-surf2:   #16213e;
            --zr-accent:  #e94560;
            --zr-acc2:    #0f3460;
            --zr-text:    #e0e0e0;
            --zr-muted:   #888;
            --zr-gold:    #ffd700;
            --zr-green:   #00e676;
            --zr-orange:  #ff9800;
            --zr-radius:  12px;
        }

        /* ── Sidebar button ────────────────────── */
        #zer0rank-sidebar-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: var(--zr-text);
            font-size: 14px;
            cursor: pointer;
            transition: background .2s;
            text-align: left;
        }
        #zer0rank-sidebar-btn:hover {
            background: rgba(233,69,96,.15);
        }
        #zer0rank-sidebar-btn .zr-badge {
            margin-left: auto;
            background: var(--zr-accent);
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 999px;
            white-space: nowrap;
        }

        /* ── Nav badge ─────────────────────────── */
        #zer0rank-nav-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            background: rgba(255,215,0,.12);
            border: 1px solid var(--zr-gold);
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            color: var(--zr-gold);
            cursor: pointer;
            margin: 0 6px;
            transition: background .2s;
            white-space: nowrap;
        }
        #zer0rank-nav-badge:hover { background: rgba(255,215,0,.22); }

        /* ── Full-screen overlay ───────────────── */
        #zer0rank-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: rgba(0,0,0,.85);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: zrFadeIn .2s ease;
        }
        @keyframes zrFadeIn { from { opacity:0 } to { opacity:1 } }

        /* ── Modal ─────────────────────────────── */
        #zer0rank-modal {
            background: var(--zr-bg);
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,.08);
            width: min(96vw, 960px);
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 80px rgba(0,0,0,.6);
            animation: zrSlideUp .3s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes zrSlideUp {
            from { opacity:0; transform:translateY(40px) scale(.96) }
            to   { opacity:1; transform:translateY(0)   scale(1) }
        }

        /* ── Modal header ──────────────────────── */
        .zr-header {
            background: linear-gradient(135deg, var(--zr-surf2), var(--zr-acc2));
            padding: 18px 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 2px solid var(--zr-accent);
        }
        .zr-header h2 {
            font-size: 1.3rem;
            font-weight: 800;
            background: linear-gradient(90deg, var(--zr-accent), var(--zr-gold));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
        }
        .zr-header-sub { color: var(--zr-muted); font-size: .8rem; }
        .zr-close-btn {
            margin-left: auto;
            background: rgba(255,255,255,.08);
            border: none;
            color: var(--zr-text);
            width: 34px; height: 34px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: background .2s;
        }
        .zr-close-btn:hover { background: var(--zr-accent); }

        /* ── Tab bar ───────────────────────────── */
        .zr-tabs {
            display: flex;
            gap: 4px;
            padding: 12px 20px 0;
            background: var(--zr-surface);
            border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .zr-tab {
            padding: 8px 16px;
            border: none;
            background: transparent;
            color: var(--zr-muted);
            font-size: .85rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: color .2s, border-color .2s;
            white-space: nowrap;
        }
        .zr-tab:hover { color: var(--zr-text); }
        .zr-tab.active {
            color: var(--zr-gold);
            border-bottom-color: var(--zr-gold);
            font-weight: 700;
        }

        /* ── Scrollable body ───────────────────── */
        .zr-body {
            overflow-y: auto;
            padding: 22px;
            flex: 1;
            background: var(--zr-bg);
        }
        .zr-panel { display: none; }
        .zr-panel.active { display: block; }

        /* ── My Rank panel ─────────────────────── */
        .zr-rank-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        @media(max-width:600px){ .zr-rank-grid { grid-template-columns:1fr; } }

        .zr-hero {
            background: var(--zr-surface);
            border-radius: var(--zr-radius);
            padding: 28px;
            text-align: center;
            border: 1px solid rgba(255,255,255,.06);
            position: relative;
            overflow: hidden;
        }
        .zr-hero::before {
            content: '';
            position: absolute; inset: 0;
            background: radial-gradient(circle at 50% 0%, var(--zr-rank-color,#fff)20 0%, transparent 65%);
        }
        .zr-rank-icon { font-size: 5rem; line-height: 1.1; }
        .zr-rank-name {
            font-size: 2rem;
            font-weight: 900;
            color: var(--zr-rank-color, var(--zr-gold));
            text-shadow: 0 0 20px var(--zr-rank-color, var(--zr-gold));
            margin: 4px 0;
        }
        .zr-prestige-badge {
            display: inline-block;
            background: linear-gradient(135deg,#6a0dad,#b8860b);
            color: #fff;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: .72rem;
            font-weight: 700;
            margin-top: 4px;
        }
        .zr-progress-wrap { margin-top: 14px; }
        .zr-progress-labels {
            display: flex;
            justify-content: space-between;
            font-size: .75rem;
            color: var(--zr-muted);
            margin-bottom: 5px;
        }
        .zr-progress-bar {
            height: 8px;
            background: var(--zr-surf2);
            border-radius: 999px;
            overflow: hidden;
        }
        .zr-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--zr-accent), var(--zr-gold));
            border-radius: 999px;
            transition: width .6s ease;
        }
        .zr-progress-sub {
            font-size: .72rem;
            color: var(--zr-muted);
            text-align: right;
            margin-top: 4px;
        }

        /* ── Stat cards ────────────────────────── */
        .zr-stats { display: grid; gap: 10px; }
        .zr-stat {
            background: var(--zr-surf2);
            border-radius: var(--zr-radius);
            padding: 14px 18px;
            border: 1px solid rgba(255,255,255,.05);
        }
        .zr-stat-label { font-size: .73rem; color: var(--zr-muted); text-transform: uppercase; letter-spacing: .07em; }
        .zr-stat-value { font-size: 1.5rem; font-weight: 700; color: var(--zr-gold); margin-top: 3px; }
        .zr-stat-sub   { font-size: .73rem; color: var(--zr-muted); }
        .zr-stat.binge .zr-stat-value { color: var(--zr-orange); }

        /* ── Buttons ───────────────────────────── */
        .zr-btn {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 18px; border: none; border-radius: 8px;
            cursor: pointer; font-size: .88rem; font-weight: 600;
            transition: filter .2s, transform .1s;
        }
        .zr-btn:hover  { filter: brightness(1.15); }
        .zr-btn:active { transform: scale(.97); }
        .zr-btn-primary   { background: var(--zr-accent); color: #fff; }
        .zr-btn-warning   { background: #f57c00; color: #fff; }
        .zr-btn-danger    { background: #c62828; color: #fff; }
        .zr-btn-green     { background: #2e7d32; color: #fff; }
        .zr-btn-secondary { background: var(--zr-acc2); color: #fff; }
        .zr-btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

        /* ── Leaderboard ───────────────────────── */
        .zr-lb-header {
            display: grid; grid-template-columns: 3rem 1fr auto auto;
            padding: 6px 14px; font-size: .72rem; color: var(--zr-muted);
            text-transform: uppercase; letter-spacing: .07em;
        }
        .zr-lb-row {
            background: var(--zr-surface);
            border-radius: var(--zr-radius);
            display: grid; grid-template-columns: 3rem 1fr auto auto;
            align-items: center; padding: 10px 14px;
            border: 1px solid rgba(255,255,255,.05); gap: 6px;
            margin-bottom: 6px; transition: background .2s;
        }
        .zr-lb-row:hover { background: var(--zr-surf2); }
        .zr-lb-row.me    { border-color: var(--zr-accent); background: rgba(233,69,96,.08); }
        .zr-lb-pos       { font-size: 1.1rem; font-weight: 800; color: var(--zr-muted); text-align: center; }
        .zr-lb-pos.t1    { color: var(--zr-gold); }
        .zr-lb-pos.t2    { color: #c0c0c0; }
        .zr-lb-pos.t3    { color: #cd7f32; }
        .zr-lb-user      { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .zr-lb-avatar    {
            width: 34px; height: 34px; border-radius: 50%;
            background: var(--zr-acc2);
            display: flex; align-items: center; justify-content: center;
            font-size: .95rem; flex-shrink: 0;
        }
        .zr-lb-name  { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .zr-lb-pbadge {
            font-size: .68rem;
            background: linear-gradient(135deg,#6a0dad,#b8860b);
            padding: 1px 6px; border-radius: 999px; color: #fff; white-space: nowrap;
        }
        .zr-lb-rank  { text-align: right; white-space: nowrap; font-weight: 700; }
        .zr-lb-xp    { text-align: right; color: var(--zr-gold); font-weight: 600; font-size: .88rem; white-space: nowrap; }

        /* ── All Ranks grid ────────────────────── */
        .zr-ranks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px,1fr));
            gap: 10px;
        }
        .zr-rank-card {
            background: var(--zr-surface); border-radius: var(--zr-radius);
            padding: 16px; text-align: center;
            border: 1px solid rgba(255,255,255,.05);
            transition: transform .2s, border-color .2s;
        }
        .zr-rank-card:hover { transform: translateY(-3px); }
        .zr-rank-card.achieved {
            border-color: var(--zr-rank-color, var(--zr-gold));
            box-shadow: 0 0 14px color-mix(in srgb, var(--zr-rank-color, var(--zr-gold)) 30%, transparent);
        }
        .zr-rank-card.locked { opacity: .4; }
        .zr-rc-icon { font-size: 2.6rem; }
        .zr-rc-name { font-weight: 700; font-size: .9rem; margin-top: 6px; color: var(--zr-rank-color, var(--zr-text)); }
        .zr-rc-xp   { font-size: .7rem; color: var(--zr-muted); margin-top: 2px; }
        .zr-rc-badge {
            margin-top: 6px; font-size: .68rem;
            padding: 2px 7px; border-radius: 999px; display: inline-block;
        }
        .zr-rc-badge.achieved { background: rgba(0,200,83,.2); color: var(--zr-green); }
        .zr-rc-badge.locked   { background: rgba(255,255,255,.07); color: var(--zr-muted); }
        .zr-rc-badge.current  { background: var(--zr-accent); color: #fff; }

        /* ── XP Settings ───────────────────────── */
        .zr-xp-section-title {
            font-size: .8rem; font-weight: 700; color: var(--zr-muted);
            text-transform: uppercase; letter-spacing: .1em;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,.07);
            margin-bottom: 12px;
        }
        .zr-slider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 10px; }
        .zr-slider-row {
            background: var(--zr-surf2); border-radius: var(--zr-radius);
            padding: 12px 14px; border: 1px solid rgba(255,255,255,.05);
        }
        .zr-slider-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
        .zr-slider-lbl  { font-size: .85rem; font-weight: 600; }
        .zr-slider-val  { font-size: 1.05rem; font-weight: 800; color: var(--zr-gold); min-width: 3rem; text-align: right; }
        .zr-slider-val.binge { color: var(--zr-orange); }
        input[type=range].zr-range {
            width: 100%; height: 5px; -webkit-appearance: none;
            background: linear-gradient(90deg, var(--zr-accent) var(--pct,50%), rgba(255,255,255,.15) var(--pct,50%));
            border-radius: 999px; cursor: pointer; outline: none;
        }
        input[type=range].zr-range::-webkit-slider-thumb {
            -webkit-appearance: none; width: 16px; height: 16px;
            border-radius: 50%; background: var(--zr-gold);
            box-shadow: 0 0 5px rgba(255,215,0,.5); cursor: pointer;
        }
        input[type=range].zr-range.binge {
            background: linear-gradient(90deg, var(--zr-orange) var(--pct,50%), rgba(255,255,255,.15) var(--pct,50%));
        }
        input[type=range].zr-range.binge::-webkit-slider-thumb { background: var(--zr-orange); box-shadow: 0 0 5px rgba(255,152,0,.5); }
        .zr-slider-desc { font-size: .7rem; color: var(--zr-muted); margin-top: 5px; }

        .zr-toggle-row {
            display: flex; align-items: center; justify-content: space-between;
            background: var(--zr-surf2); border-radius: var(--zr-radius);
            padding: 12px 14px; border: 1px solid rgba(255,255,255,.05);
            margin-bottom: 10px;
        }
        .zr-toggle-name { font-weight: 600; font-size: .88rem; }
        .zr-toggle-desc { font-size: .72rem; color: var(--zr-muted); margin-top: 2px; }
        .zr-toggle { position: relative; width: 42px; height: 22px; flex-shrink: 0; }
        .zr-toggle input { opacity: 0; width: 0; height: 0; }
        .zr-toggle-sl {
            position: absolute; inset: 0;
            background: #333; border-radius: 999px; cursor: pointer; transition: background .2s;
        }
        .zr-toggle-sl::before {
            content: ''; position: absolute;
            width: 16px; height: 16px; border-radius: 50%;
            background: #fff; left: 3px; top: 3px; transition: transform .2s;
        }
        .zr-toggle input:checked + .zr-toggle-sl { background: var(--zr-orange); }
        .zr-toggle input:checked + .zr-toggle-sl::before { transform: translateX(20px); }

        .zr-binge-preview {
            background: linear-gradient(135deg,#1a1400,#261c00);
            border: 1px solid rgba(255,152,0,.3);
            border-radius: var(--zr-radius);
            padding: 14px 18px;
            display: flex; align-items: center; gap: 14px;
            margin-bottom: 16px;
        }
        .zr-fire { font-size: 2.2rem; animation: zrFlick .5s ease infinite alternate; }
        @keyframes zrFlick { to { transform: scale(1.12) rotate(3deg); } }
        .zr-binge-preview h4 { color: var(--zr-orange); margin: 0 0 3px; font-size: .95rem; }
        .zr-binge-preview p  { color: var(--zr-muted); font-size: .78rem; margin: 0; }
        .zr-binge-preview strong { color: var(--zr-orange); }

        .zr-save-bar {
            display: flex; align-items: center; justify-content: space-between;
            background: var(--zr-surf2); border-radius: var(--zr-radius);
            padding: 12px 16px; margin-top: 14px; flex-wrap: wrap; gap: 8px;
        }
        .zr-save-msg { font-size: .83rem; min-height: 1.2em; }

        /* ── Rank-up popup ─────────────────────── */
        #zer0rank-rankup {
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(0,0,0,.75);
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        .zr-rankup-box {
            background: var(--zr-surface); border-radius: 20px;
            padding: 40px 60px; text-align: center;
            border: 2px solid var(--zr-gold);
            box-shadow: 0 0 60px rgba(255,215,0,.3);
            animation: zrPop .5s cubic-bezier(.34,1.56,.64,1);
            position: relative; overflow: hidden;
        }
        @keyframes zrPop {
            from { opacity:0; transform:scale(.4) rotate(-5deg); }
            to   { opacity:1; transform:scale(1) rotate(0); }
        }
        .zr-rankup-title { font-size: .9rem; color: var(--zr-muted); letter-spacing: .15em; text-transform: uppercase; }
        .zr-rankup-icon  { font-size: 5.5rem; margin: 8px 0; animation: zrBounce .9s ease infinite alternate; }
        @keyframes zrBounce { to { transform: scale(1.1); } }
        .zr-rankup-name  { font-size: 2.2rem; font-weight: 900; color: var(--zr-gold); text-shadow: 0 0 25px var(--zr-gold); }

        .zr-particle {
            position: absolute; border-radius: 50%;
            animation: zrFloat 1.4s ease-out forwards; pointer-events: none;
        }
        @keyframes zrFloat { to { transform: translateY(-110px) translateX(var(--dx,0)) scale(0); opacity:0; } }

        /* ── Loading ───────────────────────────── */
        .zr-loading {
            display: flex; align-items: center; justify-content: center;
            gap: 10px; color: var(--zr-muted); padding: 40px;
        }
        .zr-spinner {
            width: 24px; height: 24px;
            border: 3px solid rgba(255,255,255,.1);
            border-top-color: var(--zr-accent);
            border-radius: 50%;
            animation: zrSpin .7s linear infinite;
        }
        @keyframes zrSpin { to { transform: rotate(360deg); } }

        .zr-section-title { font-size: 1.2rem; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
        `;
        document.head.appendChild(style);
    }

    // ── API helper ────────────────────────────────────────────
    async function api(path, opts = {}) {
        const res = await fetch(ZER0RANK_CONFIG.apiBase + path, {
            headers: { 'X-User-Id': _userId || '', ...opts.headers },
            ...opts
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }

    function fmt(n) { return Number(n).toLocaleString(); }
    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function medal(p) { return p===1?'🥇':p===2?'🥈':p===3?'🥉':p; }
    function fmtSec(s) {
        if (s >= 3600) return (s/3600).toFixed(1).replace('.0','')+'h';
        if (s >= 60)   return Math.round(s/60)+' min';
        return s+'s';
    }

    // ── Get current user from Jellyfin ────────────────────────
    function getCurrentJellyfinUser() {
        try {
            _userId = ApiClient.getCurrentUserId();
        } catch(e) {
            _userId = localStorage.getItem('zer0rank_userId') || null;
        }
    }

    // ── Inject sidebar button ─────────────────────────────────
    function injectSidebarButton() {
        // Jellyfin's sidebar nav links list
        const nav = document.querySelector('.mainDrawer-scrollContainer') ||
                    document.querySelector('.navMenuContainer') ||
                    document.querySelector('[data-role="navigation"]');
        if (!nav || document.getElementById('zer0rank-sidebar-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'zer0rank-sidebar-btn';
        btn.innerHTML = `
            <span style="font-size:1.2rem">⚔️</span>
            <span>Watch Ranks</span>
            <span class="zr-badge" id="zr-sidebar-rank-badge">…</span>
        `;
        btn.addEventListener('click', openDashboard);
        nav.appendChild(btn);
    }

    // ── Inject nav badge ──────────────────────────────────────
    function injectNavBadge() {
        if (!ZER0RANK_CONFIG.showNavBadge) return;
        const headerRight = document.querySelector('.headerRight') ||
                            document.querySelector('.skinHeader-withBackground .flex') ||
                            document.querySelector('.headerButtons');
        if (!headerRight || document.getElementById('zer0rank-nav-badge')) return;

        const badge = document.createElement('span');
        badge.id = 'zer0rank-nav-badge';
        badge.textContent = '⚔️ …';
        badge.title = 'Open Zer0-Rank Dashboard';
        badge.addEventListener('click', openDashboard);
        headerRight.insertBefore(badge, headerRight.firstChild);
    }

    // ── Update mini badges with current rank ──────────────────
    function updateMiniUI(data) {
        if (!data) return;
        const color = RANK_COLORS[data.rankName] || '#ffd700';
        const text  = `${data.rankIcon} ${data.rankName}`;
        const navB  = document.getElementById('zer0rank-nav-badge');
        const sideB = document.getElementById('zr-sidebar-rank-badge');
        if (navB)  { navB.textContent  = text; navB.style.color = color; navB.style.borderColor = color; navB.style.background = color+'20'; }
        if (sideB) { sideB.textContent = text; }
    }

    // ── Build and open the dashboard modal ───────────────────
    function openDashboard() {
        if (document.getElementById('zer0rank-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'zer0rank-overlay';
        overlay.innerHTML = `
        <div id="zer0rank-modal">
            <div class="zr-header">
                <span style="font-size:1.6rem">⚔️</span>
                <div>
                    <h2>Zer0-Rank</h2>
                    <div class="zr-header-sub">Watch History · RPG Experience</div>
                </div>
                <button class="zr-close-btn" id="zr-close">✕</button>
            </div>
            <div class="zr-tabs">
                <button class="zr-tab active" data-tab="me">My Rank</button>
                <button class="zr-tab" data-tab="lb">🏆 Leaderboard</button>
                <button class="zr-tab" data-tab="ranks">📋 All Ranks</button>
                <button class="zr-tab" data-tab="xp" style="color:var(--zr-orange)">🔥 XP Settings</button>
            </div>
            <div class="zr-body">
                <div class="zr-panel active" id="zrp-me">
                    <div class="zr-loading"><div class="zr-spinner"></div> Loading…</div>
                </div>
                <div class="zr-panel" id="zrp-lb">
                    <div class="zr-section-title">🏆 Server Leaderboard</div>
                    <div id="zr-lb-content"><div class="zr-loading"><div class="zr-spinner"></div> Loading…</div></div>
                </div>
                <div class="zr-panel" id="zrp-ranks">
                    <div class="zr-section-title">📋 All Ranks</div>
                    <div id="zr-ranks-content" class="zr-ranks-grid"></div>
                </div>
                <div class="zr-panel" id="zrp-xp">
                    <div class="zr-section-title">🔥 XP Settings</div>
                    <div id="zr-xp-content"><div class="zr-loading"><div class="zr-spinner"></div> Loading…</div></div>
                </div>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Close button & backdrop click
        document.getElementById('zr-close').addEventListener('click', closeDashboard);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeDashboard(); });

        // Keyboard close
        document._zrKeyClose = e => { if (e.key === 'Escape') closeDashboard(); };
        document.addEventListener('keydown', document._zrKeyClose);

        // Tabs
        overlay.querySelectorAll('.zr-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                overlay.querySelectorAll('.zr-tab').forEach(t => t.classList.remove('active'));
                overlay.querySelectorAll('.zr-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('zrp-' + tab.dataset.tab).classList.add('active');

                if (tab.dataset.tab === 'lb')    loadLeaderboard();
                if (tab.dataset.tab === 'ranks') loadAllRanks();
                if (tab.dataset.tab === 'xp')    loadXpSettings();
            });
        });

        loadMyRank();
    }

    function closeDashboard() {
        const ov = document.getElementById('zer0rank-overlay');
        if (ov) ov.remove();
        if (document._zrKeyClose) {
            document.removeEventListener('keydown', document._zrKeyClose);
            delete document._zrKeyClose;
        }
    }

    // ── My Rank panel ─────────────────────────────────────────
    async function loadMyRank() {
        const panel = document.getElementById('zrp-me');
        if (!panel) return;

        try {
            const [d, binge] = await Promise.all([
                api('/WatchRanks/Me'),
                api('/WatchRanks/BingeStats/' + _userId).catch(() => null)
            ]);
            _userData = d;
            updateMiniUI(d);

            const color = RANK_COLORS[d.rankName] || '#ffd700';

            panel.innerHTML = `
            <div class="zr-rank-grid">
                <div class="zr-hero" style="--zr-rank-color:${color}">
                    <div class="zr-rank-icon">${d.rankIcon}</div>
                    <div class="zr-rank-name" style="color:${color}">${esc(d.rankName)}</div>
                    ${d.prestigeCount > 0 ? `<span class="zr-prestige-badge">✨ Prestige ${d.prestigeCount}</span>` : ''}
                    <div class="zr-progress-wrap">
                        <div class="zr-progress-labels">
                            <span>${esc(d.rankName)}</span>
                            <span>${d.xpToNext > 0 ? 'Next rank' : 'MAX'}</span>
                        </div>
                        <div class="zr-progress-bar">
                            <div class="zr-progress-fill" style="width:${d.progressPercent}%"></div>
                        </div>
                        <div class="zr-progress-sub">
                            ${d.xpToNext > 0 ? fmt(d.xpToNext)+' XP to go' : '🎊 Demon King!'}
                        </div>
                    </div>
                </div>

                <div class="zr-stats">
                    <div class="zr-stat">
                        <div class="zr-stat-label">Total XP</div>
                        <div class="zr-stat-value">${fmt(d.totalXp)} XP</div>
                    </div>
                    <div class="zr-stat">
                        <div class="zr-stat-label">Leaderboard</div>
                        <div class="zr-stat-value">#${d.leaderboardPosition}</div>
                    </div>
                    <div class="zr-stat">
                        <div class="zr-stat-label">XP to next rank</div>
                        <div class="zr-stat-value">${d.xpToNext > 0 ? fmt(d.xpToNext)+' XP' : '—'}</div>
                        <div class="zr-stat-sub">${d.xpToNext > 0 ? d.progressPercent.toFixed(1)+'% progress' : 'Demon King!'}</div>
                    </div>
                    ${binge ? `
                    <div class="zr-stat binge">
                        <div class="zr-stat-label">🔥 Binge Days</div>
                        <div class="zr-stat-value">${binge.bingeDaysTotal} days</div>
                        <div class="zr-stat-sub">${fmt(binge.totalBingeXp)} binge XP total</div>
                    </div>` : ''}
                    <div class="zr-stat">
                        <div class="zr-stat-label">Prestige</div>
                        <div class="zr-stat-value">${d.prestigeCount}</div>
                    </div>
                    <div class="zr-btn-row">
                        <button class="zr-btn zr-btn-primary" id="zr-refresh-btn">↻ Refresh</button>
                        ${d.rankName === 'Demon King' ? '<button class="zr-btn zr-btn-warning" id="zr-prestige-btn">😈 Prestige!</button>' : ''}
                    </div>
                </div>
            </div>`;

            document.getElementById('zr-refresh-btn')?.addEventListener('click', loadMyRank);
            document.getElementById('zr-prestige-btn')?.addEventListener('click', doPrestige);

            // Check rank-up
            if (_lastRank && _lastRank !== d.rankName && ZER0RANK_CONFIG.showRankupPopup) {
                showRankupPopup(d.rankName, d.rankIcon);
            }
            _lastRank = d.rankName;
            localStorage.setItem('zer0rank_lastRank', _lastRank);

        } catch(e) {
            panel.innerHTML = `<p style="color:var(--zr-accent);padding:2rem">❌ Could not load rank data. Is the Zer0-Rank backend running at <code>${ZER0RANK_CONFIG.apiBase}</code>?</p>`;
        }
    }

    // ── Leaderboard ───────────────────────────────────────────
    async function loadLeaderboard() {
        const el = document.getElementById('zr-lb-content');
        if (!el) return;
        try {
            const data = await api('/WatchRanks/Leaderboard');
            el.innerHTML = `
            <div class="zr-lb-header">
                <span>#</span><span>Player</span><span>Rank</span><span style="text-align:right">XP</span>
            </div>` + data.map((u, i) => {
                const color   = RANK_COLORS[u.rankName] || '#ffd700';
                const posClass = ['t1','t2','t3'][i] || '';
                const isMe     = u.userId === _userId;
                return `
                <div class="zr-lb-row ${isMe?'me':''}">
                    <div class="zr-lb-pos ${posClass}">${medal(i+1)}</div>
                    <div class="zr-lb-user">
                        <div class="zr-lb-avatar">${esc(u.username).charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="zr-lb-name">${esc(u.username)} ${isMe?'<span style="color:var(--zr-accent);font-size:.7rem">(you)</span>':''}</div>
                            ${u.prestigeCount>0?`<span class="zr-lb-pbadge">✨ P${u.prestigeCount}</span>`:''}
                        </div>
                    </div>
                    <div class="zr-lb-rank" style="color:${color}">${u.rankIcon} ${esc(u.rankName)}</div>
                    <div class="zr-lb-xp">${fmt(u.totalXp)}</div>
                </div>`;
            }).join('');
        } catch(e) {
            document.getElementById('zr-lb-content').innerHTML = '<p style="color:var(--zr-accent);padding:1rem">Failed to load leaderboard.</p>';
        }
    }

    // ── All Ranks ─────────────────────────────────────────────
    async function loadAllRanks() {
        const el = document.getElementById('zr-ranks-content');
        if (!el) return;
        try {
            const [ranksData, meData] = await Promise.all([
                api('/WatchRanks/Ranks'),
                api('/WatchRanks/Me').catch(() => null)
            ]);
            const myXp = meData ? meData.totalXp : -1;
            el.innerHTML = ranksData.map(r => {
                const color    = RANK_COLORS[r.name] || '#ffd700';
                const achieved = myXp >= r.xpRequired;
                const current  = meData && meData.rankName === r.name;
                return `
                <div class="zr-rank-card ${current?'achieved':achieved?'achieved':'locked'}" style="--zr-rank-color:${color}">
                    <div class="zr-rc-icon">${r.icon}</div>
                    <div class="zr-rc-name">${esc(r.name)}</div>
                    <div class="zr-rc-xp">${fmt(r.xpRequired)} XP</div>
                    <span class="zr-rc-badge ${current?'current':achieved?'achieved':'locked'}">${current?'◀ Current':achieved?'✓ Done':'🔒'}</span>
                </div>`;
            }).join('');
        } catch(e) {
            document.getElementById('zr-ranks-content').innerHTML = '<p style="color:var(--zr-accent)">Failed.</p>';
        }
    }

    // ── XP Settings ───────────────────────────────────────────
    async function loadXpSettings() {
        const el = document.getElementById('zr-xp-content');
        if (!el) return;
        try {
            const cfg = await api('/WatchRanks/Config');

            el.innerHTML = `
            <div class="zr-binge-preview" id="zr-binge-prev">
                <div class="zr-fire">🔥</div>
                <div>
                    <h4>Binge Bonus</h4>
                    <p>You earn <strong id="zr-prev-bonus">${fmt(cfg.bingeXpBonus)} XP</strong> for watching
                       <strong id="zr-prev-hours">${cfg.bingeThresholdHours}h</strong> in a row.
                       Gaps up to <strong id="zr-prev-gap">${fmtSec(cfg.bingeGapToleranceSeconds)}</strong> still count as continuous.</p>
                </div>
            </div>

            <!-- Base XP -->
            <div style="margin-bottom:16px">
                <div class="zr-xp-section-title">⚡ Base XP</div>
                <div class="zr-slider-grid">
                    ${sliderHtml('perMinute','XP per Minute',cfg.xpPerMinute,1,20,1,'XP earned per real minute watched.')}
                    ${sliderHtml('perEpisode','XP per Episode',cfg.xpPerEpisode,0,200,5,'Bonus for completing an episode.')}
                    ${sliderHtml('perMovie','XP per Movie',cfg.xpPerMovie,0,500,5,'Bonus for completing a movie.')}
                    ${sliderHtml('threshold','Completion Threshold',Math.round(cfg.completionThreshold*100),50,100,5,'Min % of item watched for completion bonus.','%')}
                    ${sliderHtml('epMin','Episode Min Watch (sec)',cfg.episodeMinWatchSeconds,60,3600,60,'Min seconds watched for episode bonus.','s')}
                    ${sliderHtml('mvMin','Movie Min Watch (sec)',cfg.movieMinWatchSeconds,300,7200,300,'Min seconds watched for movie bonus.','s')}
                </div>
            </div>

            <!-- Binge Bonus -->
            <div style="margin-bottom:16px">
                <div class="zr-xp-section-title">🔥 Binge Bonus</div>
                <div class="zr-toggle-row">
                    <div>
                        <div class="zr-toggle-name">Enable Binge Bonus</div>
                        <div class="zr-toggle-desc">Extra XP for continuous multi-hour watch sessions.</div>
                    </div>
                    <label class="zr-toggle">
                        <input type="checkbox" id="zr-tog-binge" ${cfg.bingeEnabled?'checked':''}>
                        <span class="zr-toggle-sl"></span>
                    </label>
                </div>
                <div class="zr-slider-grid">
                    ${sliderHtml('bingeBonus','Bonus XP per Binge Day',cfg.bingeXpBonus,50,5000,50,'XP rewarded for each qualifying binge day.','','binge')}
                    ${sliderHtml('bingeHours','Binge Threshold (hours)',cfg.bingeThresholdHours,1,12,0.5,'Hours of continuous watching required.','h','binge')}
                    ${sliderHtml('bingeGap','Gap Tolerance (sec)',cfg.bingeGapToleranceSeconds,0,3600,60,'Max gap still counted as continuous.','s','binge')}
                </div>
            </div>

            <!-- Save -->
            <div class="zr-save-bar">
                <div>
                    <div style="font-weight:700;margin-bottom:2px">Save Settings</div>
                    <div style="font-size:.78rem;color:var(--zr-muted)">Changes take effect on next sync (~10 min). Not persisted across restarts.</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span class="zr-save-msg" id="zr-save-msg" style="color:var(--zr-green)"></span>
                    <button class="zr-btn zr-btn-secondary" onclick="loadXpSettings()">↺ Reset</button>
                    <button class="zr-btn zr-btn-green" id="zr-save-btn">💾 Save</button>
                </div>
            </div>`;

            // Wire up sliders
            el.querySelectorAll('input[type=range]').forEach(sl => {
                updateSliderGradient(sl);
                sl.addEventListener('input', () => {
                    updateSliderGradient(sl);
                    updateSliderVal(sl);
                    updateBingePreview();
                });
            });
            el.querySelector('#zr-tog-binge').addEventListener('change', updateBingePreview);
            el.querySelector('#zr-save-btn').addEventListener('click', saveXpSettings);

        } catch(e) {
            el.innerHTML = '<p style="color:var(--zr-accent);padding:1rem">Failed to load config.</p>';
        }
    }

    function sliderHtml(id, label, value, min, max, step, desc, unit = '', cls = '') {
        return `
        <div class="zr-slider-row">
            <div class="zr-slider-head">
                <span class="zr-slider-lbl">${label}</span>
                <span class="zr-slider-val ${cls}" id="zrv-${id}">${value}${unit}</span>
            </div>
            <input type="range" class="zr-range ${cls}" id="zrs-${id}"
                   min="${min}" max="${max}" value="${value}" step="${step}" data-unit="${unit}" data-id="${id}">
            <div class="zr-slider-desc">${desc}</div>
        </div>`;
    }

    function updateSliderGradient(sl) {
        const pct = ((sl.value - sl.min) / (sl.max - sl.min) * 100).toFixed(1) + '%';
        sl.style.setProperty('--pct', pct);
    }

    function updateSliderVal(sl) {
        const val = document.getElementById('zrv-' + sl.dataset.id);
        if (val) val.textContent = Number(sl.value) + (sl.dataset.unit || '');
    }

    function updateBingePreview() {
        const enabled = document.getElementById('zr-tog-binge')?.checked;
        const bonus   = document.getElementById('zrs-bingeBonus')?.value;
        const hours   = document.getElementById('zrs-bingeHours')?.value;
        const gap     = document.getElementById('zrs-bingeGap')?.value;
        const prev    = document.getElementById('zr-binge-prev');
        if (prev) prev.style.opacity = enabled ? '1' : '0.4';
        document.getElementById('zr-prev-bonus')?.textContent !== undefined
            && (document.getElementById('zr-prev-bonus').textContent = fmt(bonus||500)+' XP');
        document.getElementById('zr-prev-hours')?.textContent !== undefined
            && (document.getElementById('zr-prev-hours').textContent = Number(hours||3).toFixed(1)+'h');
        document.getElementById('zr-prev-gap')?.textContent !== undefined
            && (document.getElementById('zr-prev-gap').textContent = fmtSec(Number(gap||600)));
    }

    async function saveXpSettings() {
        const msg = document.getElementById('zr-save-msg');
        msg.style.color = 'var(--zr-muted)'; msg.textContent = 'Saving…';

        const g = id => document.getElementById('zrs-'+id);
        const body = {
            xpPerMinute:             Number(g('perMinute')?.value   || 2),
            xpPerEpisode:            Number(g('perEpisode')?.value  || 20),
            xpPerMovie:              Number(g('perMovie')?.value    || 20),
            completionThreshold:     Number(g('threshold')?.value   || 80) / 100,
            episodeMinWatchSeconds:  Number(g('epMin')?.value       || 900),
            movieMinWatchSeconds:    Number(g('mvMin')?.value       || 2700),
            bingeEnabled:            document.getElementById('zr-tog-binge')?.checked ?? true,
            bingeThresholdHours:     Number(g('bingeHours')?.value  || 3),
            bingeXpBonus:            Number(g('bingeBonus')?.value  || 500),
            bingeGapToleranceSeconds:Number(g('bingeGap')?.value    || 600),
        };

        try {
            await fetch(ZER0RANK_CONFIG.apiBase + '/WatchRanks/Config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin': 'true' },
                body: JSON.stringify(body)
            });
            msg.style.color = 'var(--zr-green)';
            msg.textContent = '✅ Saved!';
            setTimeout(() => msg.textContent = '', 3000);
        } catch(e) {
            msg.style.color = 'var(--zr-accent)';
            msg.textContent = '❌ Save failed.';
        }
    }

    // ── Prestige ──────────────────────────────────────────────
    async function doPrestige() {
        if (!confirm('Prestige resets your XP to Bronze. Continue?')) return;
        try {
            const d = await api('/WatchRanks/Prestige', { method: 'POST' });
            alert(d.message);
            loadMyRank();
        } catch(e) { alert('Prestige failed.'); }
    }

    // ── Rank-up popup ─────────────────────────────────────────
    function showRankupPopup(rankName, rankIcon) {
        if (document.getElementById('zer0rank-rankup')) return;
        const el = document.createElement('div');
        el.id = 'zer0rank-rankup';
        el.innerHTML = `
        <div class="zr-rankup-box" id="zr-rankup-inner">
            <div class="zr-rankup-title">🎉 RANK UP!</div>
            <div class="zr-rankup-icon">${rankIcon}</div>
            <div class="zr-rankup-name">${esc(rankName)}</div>
            <div style="margin-top:20px">
                <button class="zr-btn zr-btn-primary" id="zr-rankup-close">Awesome! 🎊</button>
            </div>
        </div>`;
        document.body.appendChild(el);
        spawnParticles(document.getElementById('zr-rankup-inner'));
        document.getElementById('zr-rankup-close').addEventListener('click', () => el.remove());
        el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    }

    function spawnParticles(box) {
        const colors = ['#ffd700','#e94560','#00e676','#40c4ff','#aa00ff'];
        for (let i = 0; i < 28; i++) {
            const p = document.createElement('div');
            p.className = 'zr-particle';
            const sz = 5 + Math.random() * 7;
            p.style.cssText = [
                `width:${sz}px`, `height:${sz}px`,
                `background:${colors[i%5]}`,
                `left:${Math.random()*100}%`,
                `bottom:${Math.random()*35}%`,
                `--dx:${(Math.random()-.5)*100}px`,
                `animation-duration:${.8+Math.random()*.7}s`,
                `animation-delay:${Math.random()*.25}s`
            ].join(';');
            box.appendChild(p);
            p.addEventListener('animationend', () => p.remove());
        }
    }

    // ── Background refresh ────────────────────────────────────
    async function backgroundRefresh() {
        try {
            const d = await api('/WatchRanks/Me');
            updateMiniUI(d);
            if (_lastRank && _lastRank !== d.rankName && ZER0RANK_CONFIG.showRankupPopup) {
                showRankupPopup(d.rankName, d.rankIcon);
            }
            _lastRank = d.rankName;
            localStorage.setItem('zer0rank_lastRank', _lastRank);
        } catch(_) {}
    }

    // ── Re-inject on navigation (Jellyfin is a SPA) ───────────
    function watchNavigation() {
        // Jellyfin fires this event when navigating between pages
        document.addEventListener('viewshow', () => {
            setTimeout(() => {
                injectSidebarButton();
                injectNavBadge();
            }, 300);
        });
    }

    // ── Bootstrap ────────────────────────────────────────────
    function init() {
        getCurrentJellyfinUser();
        injectStyles();
        injectSidebarButton();
        injectNavBadge();
        watchNavigation();
        backgroundRefresh();
        setInterval(backgroundRefresh, ZER0RANK_CONFIG.refreshInterval);
    }

    waitForJellyfin(init);

})();
