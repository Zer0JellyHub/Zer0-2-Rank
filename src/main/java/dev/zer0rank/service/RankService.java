package dev.zer0rank.service;

import dev.zer0rank.config.RankConfig;
import dev.zer0rank.model.Rank;
import dev.zer0rank.model.RankResponse;
import dev.zer0rank.model.UserRank;
import dev.zer0rank.model.UserRankRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Core rank service.
 *   – Syncs XP from Playback Reporting every 10 minutes.
 *   – Handles Prestige and Season Reset.
 *   – Provides user and leaderboard data.
 */
@Service
public class RankService {

    private static final Logger log = LoggerFactory.getLogger(RankService.class);

    private final UserRankRepository     repo;
    private final PlaybackReportingService playback;
    private final JellyfinApiService     jellyfin;
    private final RankConfig             config;

    public RankService(UserRankRepository repo,
                       PlaybackReportingService playback,
                       JellyfinApiService jellyfin,
                       RankConfig config) {
        this.repo     = repo;
        this.playback = playback;
        this.jellyfin = jellyfin;
        this.config   = config;
    }

    // ── Scheduled sync ────────────────────────────────────────

    /** Recalculates XP for all users every 10 minutes. */
    @Scheduled(fixedDelay = 600_000, initialDelay = 5_000)
    public void syncAllUsers() {
        log.info("XP sync started...");

        if (!playback.isDatabaseAvailable()) {
            log.warn("Playback Reporting DB not accessible – skipping sync.");
            return;
        }

        Map<String, String> jfUsers = jellyfin.fetchAllUsers();
        Map<String, Long>   xpMap   = playback.calculateXpForAllUsers();

        for (Map.Entry<String, Long> entry : xpMap.entrySet()) {
            String userId = entry.getKey();
            long   xp     = entry.getValue();

            UserRank ur = repo.findById(userId)
                    .orElseGet(() -> new UserRank(userId,
                            jfUsers.getOrDefault(userId, "Unknown")));

            if (jfUsers.containsKey(userId)) {
                ur.setUsername(jfUsers.get(userId));
            }
            ur.setTotalXp(xp);
            ur.recalcRank();
            repo.save(ur);
        }
        log.info("XP sync complete – {} users processed.", xpMap.size());
    }

    // ── User queries ──────────────────────────────────────────

    public Optional<RankResponse> getRankForUser(String userId) {
        return repo.findById(userId)
                   .map(ur -> RankResponse.from(ur, leaderboardPosition(userId)));
    }

    public List<RankResponse> getLeaderboard() {
        List<UserRank>    board  = repo.findLeaderboard();
        List<RankResponse> result = new ArrayList<>();
        for (int i = 0; i < board.size(); i++) {
            result.add(RankResponse.from(board.get(i), i + 1));
        }
        return result;
    }

    public List<Map<String, Object>> getAllRanks() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Rank r : Rank.values()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name",       r.displayName);
            m.put("icon",       r.icon);
            m.put("xpRequired", r.xpRequired);
            list.add(m);
        }
        return list;
    }

    // ── Prestige ──────────────────────────────────────────────

    public String prestige(String userId) {
        if (!config.getRanks().isPrestigeEnabled()) return "Prestige is disabled.";

        Optional<UserRank> opt = repo.findById(userId);
        if (opt.isEmpty()) return "User not found.";

        UserRank ur = opt.get();
        if (ur.getCurrentRank() != Rank.DEMON_KING) {
            return "You must reach Demon King (6,000,000 XP) to prestige.";
        }
        ur.setPrestigeCount(ur.getPrestigeCount() + 1);
        ur.setTotalXp(0);
        ur.recalcRank();
        repo.save(ur);
        log.info("User {} prestiged → P{}", userId, ur.getPrestigeCount());
        return "Prestige successful! You are now Prestige " + ur.getPrestigeCount() + ".";
    }

    // ── Season Reset ──────────────────────────────────────────

    public String resetSeason() {
        String carryoverName = config.getRanks().getSeasonCarryoverRank();
        long   carryoverXp   = Rank.BRONZE.xpRequired;

        for (Rank r : Rank.values()) {
            if (r.displayName.equalsIgnoreCase(carryoverName)) {
                carryoverXp = r.xpRequired;
                break;
            }
        }

        int carried = 0, reset = 0;
        long now = System.currentTimeMillis();

        for (UserRank ur : repo.findAll()) {
            ur.setLastSeasonResetMs(now);
            if (ur.getCurrentRank().xpRequired >= carryoverXp) {
                carried++;
            } else {
                ur.setTotalXp(0);
                ur.recalcRank();
                reset++;
            }
            repo.save(ur);
        }

        log.info("Season reset: {} carried, {} reset.", carried, reset);
        return String.format("Season reset complete. %d carried over, %d reset.", carried, reset);
    }

    // ── Helpers ───────────────────────────────────────────────

    private int leaderboardPosition(String userId) {
        List<UserRank> board = repo.findLeaderboard();
        for (int i = 0; i < board.size(); i++) {
            if (board.get(i).getUserId().equals(userId)) return i + 1;
        }
        return -1;
    }
}
