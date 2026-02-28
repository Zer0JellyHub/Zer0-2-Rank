package dev.zer0rank.controller;

import dev.zer0rank.model.RankResponse;
import dev.zer0rank.service.RankService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Core REST API – mirrors the original Zer0-2-Rank plugin endpoints.
 *
 * GET  /WatchRanks/Me                  → caller's rank (X-User-Id header)
 * GET  /WatchRanks/User/{userId}       → any user's rank
 * GET  /WatchRanks/Leaderboard         → full leaderboard
 * GET  /WatchRanks/Ranks               → all 15 rank definitions
 * POST /WatchRanks/Prestige            → prestige (X-User-Id header)
 * POST /WatchRanks/Season/Reset        → admin season reset (X-Admin: true)
 * POST /WatchRanks/Sync                → force immediate XP sync (X-Admin: true)
 */
@RestController
@RequestMapping("/WatchRanks")
@CrossOrigin(origins = "*")
public class WatchRanksController {

    private final RankService rankService;

    public WatchRanksController(RankService rankService) {
        this.rankService = rankService;
    }

    @GetMapping("/Me")
    public ResponseEntity<?> getMyRank(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null || userId.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "X-User-Id header required"));
        return rankService.getRankForUser(userId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/User/{userId}")
    public ResponseEntity<?> getUserRank(@PathVariable String userId) {
        return rankService.getRankForUser(userId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/Leaderboard")
    public List<RankResponse> getLeaderboard() {
        return rankService.getLeaderboard();
    }

    @GetMapping("/Ranks")
    public List<Map<String, Object>> getAllRanks() {
        return rankService.getAllRanks();
    }

    @PostMapping("/Prestige")
    public ResponseEntity<Map<String, String>> prestige(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null || userId.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "X-User-Id header required"));
        return ResponseEntity.ok(Map.of("message", rankService.prestige(userId)));
    }

    @PostMapping("/Season/Reset")
    public ResponseEntity<Map<String, String>> resetSeason(
            @RequestHeader(value = "X-Admin", required = false) String isAdmin) {
        if (!"true".equalsIgnoreCase(isAdmin))
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required (X-Admin: true)"));
        return ResponseEntity.ok(Map.of("message", rankService.resetSeason()));
    }

    @PostMapping("/Sync")
    public ResponseEntity<Map<String, String>> forceSync(
            @RequestHeader(value = "X-Admin", required = false) String isAdmin) {
        if (!"true".equalsIgnoreCase(isAdmin))
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required (X-Admin: true)"));
        rankService.syncAllUsers();
        return ResponseEntity.ok(Map.of("message", "Sync triggered."));
    }
}
