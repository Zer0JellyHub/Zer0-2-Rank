package dev.zer0rank.model;

/**
 * Lightweight DTO returned by all REST endpoints.
 */
public class RankResponse {

    private String userId;
    private String username;
    private long   totalXp;
    private String rankName;
    private String rankIcon;
    private long   xpToNext;
    private double progressPercent;
    private int    prestigeCount;
    private int    leaderboardPosition;

    // ── Factory ───────────────────────────────────────────────

    public static RankResponse from(UserRank u, int position) {
        RankResponse r        = new RankResponse();
        r.userId              = u.getUserId();
        r.username            = u.getUsername();
        r.totalXp             = u.getTotalXp();
        r.rankName            = u.getCurrentRank().displayName;
        r.rankIcon            = u.getCurrentRank().icon;
        r.xpToNext            = u.xpToNextRank();
        r.progressPercent     = Math.round(u.progressInCurrentRank() * 10000.0) / 100.0;
        r.prestigeCount       = u.getPrestigeCount();
        r.leaderboardPosition = position;
        return r;
    }

    // ── Getters (Jackson serialization) ───────────────────────

    public String getUserId()              { return userId; }
    public String getUsername()            { return username; }
    public long   getTotalXp()             { return totalXp; }
    public String getRankName()            { return rankName; }
    public String getRankIcon()            { return rankIcon; }
    public long   getXpToNext()            { return xpToNext; }
    public double getProgressPercent()     { return progressPercent; }
    public int    getPrestigeCount()       { return prestigeCount; }
    public int    getLeaderboardPosition() { return leaderboardPosition; }
}
