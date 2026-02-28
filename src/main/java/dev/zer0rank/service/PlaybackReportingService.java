package dev.zer0rank.service;

import dev.zer0rank.config.RankConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Reads the Playback Reporting plugin SQLite database directly.
 *
 * Table: PlaybackActivity
 *   UserId        TEXT
 *   ItemId        TEXT
 *   ItemType      TEXT      ("Episode" | "Movie" | ...)
 *   ItemDuration  INTEGER   (total item length in seconds)
 *   PlayDuration  INTEGER   (actually played seconds)
 *   DateCreated   TEXT      ("2024-03-15 21:04:00")
 */
@Service
public class PlaybackReportingService {

    private static final Logger log = LoggerFactory.getLogger(PlaybackReportingService.class);
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final RankConfig config;

    public PlaybackReportingService(RankConfig config) {
        this.config = config;
    }

    // ─────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────

    /**
     * Calculates total XP for a user:
     *   1. Watch-time XP  : (PlayDuration_capped / 60) * xpPerMinute
     *   2. Completion XP  : +xpPerEpisode / +xpPerMovie per distinct completed item
     *   3. Binge Bonus    : +bingeXpBonus per calendar day with a continuous block
     *                        >= bingeThresholdHours (gap tolerance applies)
     *
     * @param userId     Jellyfin user UUID
     * @param sinceEpoch 0 = all-time; otherwise Unix epoch seconds lower bound
     */
    public long calculateXpForUser(String userId, long sinceEpoch) {
        RankConfig.Xp xp  = config.getXp();
        String        url = jdbcUrl();

        long watchXp = 0, completionXp = 0, bingeXp = 0;

        String dateCond = sinceEpoch > 0
                ? " AND DateCreated >= datetime(" + sinceEpoch + ", 'unixepoch')"
                : "";

        // ── SQL 1: Watch-time XP ──────────────────────────────
        String watchSql = "SELECT ItemDuration, PlayDuration"
                + " FROM PlaybackActivity WHERE UserId = ?" + dateCond;

        // ── SQL 2: Completion XP (distinct items) ─────────────
        String completionSql = "SELECT ItemType, ItemDuration, MAX(PlayDuration) AS maxPlay"
                + " FROM PlaybackActivity WHERE UserId = ?"
                + " AND ItemType IN ('Episode','Movie')" + dateCond
                + " GROUP BY ItemId";

        // ── SQL 3: Binge sessions (ordered for block merging) ──
        String bingeSql = "SELECT DateCreated, PlayDuration"
                + " FROM PlaybackActivity WHERE UserId = ? AND PlayDuration > 0" + dateCond
                + " ORDER BY DateCreated ASC";

        try (Connection conn = DriverManager.getConnection(url)) {

            // Watch XP
            try (PreparedStatement ps = conn.prepareStatement(watchSql)) {
                ps.setString(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        long itemDur = rs.getLong("ItemDuration");
                        long playDur = rs.getLong("PlayDuration");
                        long capped  = itemDur > 0 ? Math.min(playDur, itemDur) : playDur;
                        watchXp += (capped / 60L) * xp.getPerMinute();
                    }
                }
            }

            // Completion XP
            try (PreparedStatement ps = conn.prepareStatement(completionSql)) {
                ps.setString(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        boolean isEp    = "Episode".equalsIgnoreCase(rs.getString("ItemType"));
                        long    itemDur = rs.getLong("ItemDuration");
                        long    maxPlay = rs.getLong("maxPlay");
                        int     minW    = isEp ? xp.getEpisodeMinWatchSeconds()
                                               : xp.getMovieMinWatchSeconds();
                        int     bonus   = isEp ? xp.getPerEpisode() : xp.getPerMovie();

                        boolean ok = maxPlay >= minW
                                && (itemDur <= 0
                                    || (double) maxPlay / itemDur >= xp.getCompletionThreshold());
                        if (ok) completionXp += bonus;
                    }
                }
            }

            // Binge XP
            if (xp.isBingeEnabled()) {
                bingeXp = calculateBingeXp(conn, bingeSql, userId, xp);
            }

        } catch (SQLException e) {
            log.error("Error reading Playback Reporting DB: {}", e.getMessage());
        }

        return watchXp + completionXp + bingeXp;
    }

    /**
     * Returns the number of qualifying binge days for a user.
     */
    public long countBingeDays(String userId) {
        if (!config.getXp().isBingeEnabled()) return 0;
        String bingeSql = "SELECT DateCreated, PlayDuration"
                + " FROM PlaybackActivity WHERE UserId = ? AND PlayDuration > 0"
                + " ORDER BY DateCreated ASC";
        try (Connection conn = DriverManager.getConnection(jdbcUrl())) {
            long totalXp = calculateBingeXp(conn, bingeSql, userId, config.getXp());
            int  bonus   = config.getXp().getBingeXpBonus();
            return bonus > 0 ? totalXp / bonus : 0;
        } catch (SQLException e) {
            return 0;
        }
    }

    /**
     * Calculates XP for every user found in the Playback Reporting DB.
     */
    public Map<String, Long> calculateXpForAllUsers() {
        Map<String, Long> result  = new HashMap<>();
        String usersSql = "SELECT DISTINCT UserId FROM PlaybackActivity WHERE UserId IS NOT NULL";
        try (Connection conn = DriverManager.getConnection(jdbcUrl());
             Statement  st   = conn.createStatement();
             ResultSet  rs   = st.executeQuery(usersSql)) {
            while (rs.next()) {
                String uid = rs.getString("UserId");
                if (uid != null && !uid.isBlank()) {
                    result.put(uid, calculateXpForUser(uid, 0));
                }
            }
        } catch (SQLException e) {
            log.error("Error scanning users in Playback Reporting DB: {}", e.getMessage());
        }
        return result;
    }

    public boolean isDatabaseAvailable() {
        try (Connection c = DriverManager.getConnection(jdbcUrl())) {
            return c != null;
        } catch (SQLException e) {
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Binge detection
    // ─────────────────────────────────────────────────────────────

    /**
     * Groups sessions by calendar day, merges blocks within gap-tolerance,
     * and awards bingeXpBonus for each day that has a block >= threshold.
     */
    private long calculateBingeXp(Connection conn, String sql,
                                   String userId, RankConfig.Xp xp) throws SQLException {

        long threshSec = (long)(xp.getBingeThresholdHours() * 3600);
        int  gapTol    = xp.getBingeGapToleranceSeconds();

        // day -> list of [endEpoch, playDuration]
        Map<String, List<long[]>> byDay = new LinkedHashMap<>();

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String dateStr = rs.getString("DateCreated");
                    long   playDur = rs.getLong("PlayDuration");
                    if (dateStr == null || playDur <= 0) continue;

                    String dayKey  = dateStr.length() >= 10 ? dateStr.substring(0, 10) : dateStr;
                    long   endEpoch = parseDate(dateStr);

                    byDay.computeIfAbsent(dayKey, k -> new ArrayList<>())
                         .add(new long[]{ endEpoch, playDur });
                }
            }
        }

        long bingeDays = 0;

        for (List<long[]> sessions : byDay.values()) {
            sessions.sort(Comparator.comparingLong(s -> s[0]));

            long blockEnd = -1, blockDur = 0;
            boolean hit = false;

            for (long[] s : sessions) {
                long end   = s[0];
                long dur   = s[1];
                long start = end - dur;

                if (blockEnd < 0) {
                    blockEnd = end; blockDur = dur;
                } else if (start - blockEnd <= gapTol) {
                    blockEnd  = Math.max(blockEnd, end);
                    blockDur += dur;
                } else {
                    if (blockDur >= threshSec) { hit = true; break; }
                    blockEnd = end; blockDur = dur;
                }
            }
            if (!hit && blockDur >= threshSec) hit = true;
            if (hit) bingeDays++;
        }

        return bingeDays * xp.getBingeXpBonus();
    }

    private long parseDate(String s) {
        try {
            String norm = s.length() >= 19 ? s.substring(0, 19) : s;
            return LocalDateTime.parse(norm, DATE_FMT)
                                .toEpochSecond(ZoneOffset.UTC);
        } catch (DateTimeParseException e) {
            return System.currentTimeMillis() / 1000;
        }
    }

    private String jdbcUrl() {
        return "jdbc:sqlite:" + config.getPlayback().getDbPath();
    }
}
