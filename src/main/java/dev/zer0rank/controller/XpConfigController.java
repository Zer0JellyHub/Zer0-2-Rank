package dev.zer0rank.controller;

import dev.zer0rank.config.RankConfig;
import dev.zer0rank.service.PlaybackReportingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Allows reading and updating the XP configuration at runtime without restart.
 *
 * GET  /WatchRanks/Config              → current XP settings
 * POST /WatchRanks/Config              → update XP settings (X-Admin: true)
 * GET  /WatchRanks/BingeStats/{userId} → binge stats for a user
 */
@RestController
@RequestMapping("/WatchRanks")
@CrossOrigin(origins = "*")
public class XpConfigController {

    private final RankConfig               config;
    private final PlaybackReportingService playback;

    public XpConfigController(RankConfig config, PlaybackReportingService playback) {
        this.config   = config;
        this.playback = playback;
    }

    // ── GET /WatchRanks/Config ────────────────────────────────

    @GetMapping("/Config")
    public Map<String, Object> getConfig() {
        RankConfig.Xp xp = config.getXp();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("xpPerMinute",              xp.getPerMinute());
        m.put("xpPerEpisode",             xp.getPerEpisode());
        m.put("xpPerMovie",               xp.getPerMovie());
        m.put("completionThreshold",      xp.getCompletionThreshold());
        m.put("episodeMinWatchSeconds",   xp.getEpisodeMinWatchSeconds());
        m.put("movieMinWatchSeconds",     xp.getMovieMinWatchSeconds());
        m.put("bingeEnabled",             xp.isBingeEnabled());
        m.put("bingeThresholdHours",      xp.getBingeThresholdHours());
        m.put("bingeXpBonus",             xp.getBingeXpBonus());
        m.put("bingeGapToleranceSeconds", xp.getBingeGapToleranceSeconds());
        return m;
    }

    // ── POST /WatchRanks/Config ───────────────────────────────

    /**
     * JSON body (all fields optional):
     * {
     *   "xpPerMinute":             2,
     *   "xpPerEpisode":            20,
     *   "xpPerMovie":              20,
     *   "completionThreshold":     0.80,
     *   "episodeMinWatchSeconds":  900,
     *   "movieMinWatchSeconds":    2700,
     *   "bingeEnabled":            true,
     *   "bingeThresholdHours":     3.0,
     *   "bingeXpBonus":            500,
     *   "bingeGapToleranceSeconds":600
     * }
     */
    @PostMapping("/Config")
    public ResponseEntity<?> updateConfig(
            @RequestHeader(value = "X-Admin", required = false) String isAdmin,
            @RequestBody Map<String, Object> body) {

        if (!"true".equalsIgnoreCase(isAdmin))
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required (X-Admin: true)"));

        RankConfig.Xp xp = config.getXp();

        applyInt   (body, "xpPerMinute",              xp::setPerMinute);
        applyInt   (body, "xpPerEpisode",             xp::setPerEpisode);
        applyInt   (body, "xpPerMovie",               xp::setPerMovie);
        applyDouble(body, "completionThreshold",      xp::setCompletionThreshold);
        applyInt   (body, "episodeMinWatchSeconds",   xp::setEpisodeMinWatchSeconds);
        applyInt   (body, "movieMinWatchSeconds",     xp::setMovieMinWatchSeconds);
        applyBool  (body, "bingeEnabled",             xp::setBingeEnabled);
        applyDouble(body, "bingeThresholdHours",      xp::setBingeThresholdHours);
        applyInt   (body, "bingeXpBonus",             xp::setBingeXpBonus);
        applyInt   (body, "bingeGapToleranceSeconds", xp::setBingeGapToleranceSeconds);

        return ResponseEntity.ok(Map.of("message", "Config updated.", "config", getConfig()));
    }

    // ── GET /WatchRanks/BingeStats/{userId} ──────────────────

    @GetMapping("/BingeStats/{userId}")
    public Map<String, Object> getBingeStats(@PathVariable String userId) {
        long days  = playback.countBingeDays(userId);
        RankConfig.Xp xp = config.getXp();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("userId",              userId);
        m.put("bingeDaysTotal",      days);
        m.put("totalBingeXp",        days * xp.getBingeXpBonus());
        m.put("bingeThresholdHours", xp.getBingeThresholdHours());
        m.put("bingeXpBonusPerDay",  xp.getBingeXpBonus());
        return m;
    }

    // ── Helpers ───────────────────────────────────────────────

    private void applyInt(Map<String, Object> b, String key, Consumer<Integer> s) {
        if (b.containsKey(key)) {
            try { s.accept(((Number) b.get(key)).intValue()); }
            catch (Exception ignored) {}
        }
    }

    private void applyDouble(Map<String, Object> b, String key, Consumer<Double> s) {
        if (b.containsKey(key)) {
            try { s.accept(((Number) b.get(key)).doubleValue()); }
            catch (Exception ignored) {}
        }
    }

    private void applyBool(Map<String, Object> b, String key, Consumer<Boolean> s) {
        if (b.containsKey(key)) {
            try { s.accept((Boolean) b.get(key)); }
            catch (Exception ignored) {}
        }
    }
}
