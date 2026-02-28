package dev.zer0rank.model;

import jakarta.persistence.*;

/**
 * Persisted rank data for a single Jellyfin user.
 * Stored in zer0rank.db (separate from Playback Reporting DB).
 *
 * NOTE: Instant is stored as epoch-millis (Long) for full SQLite compatibility.
 */
@Entity
@Table(name = "user_ranks")
public class UserRank {

    @Id
    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "username", length = 128)
    private String username;

    @Column(name = "total_xp")
    private long totalXp = 0;

    @Column(name = "prestige_count")
    private int prestigeCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_rank", length = 32)
    private Rank currentRank = Rank.BRONZE;

    /** Unix epoch millis – stored as plain BIGINT for SQLite compatibility. */
    @Column(name = "last_updated")
    private long lastUpdatedMs = System.currentTimeMillis();

    @Column(name = "last_season_reset")
    private long lastSeasonResetMs = 0;

    // ── Constructors ───────────────────────────────────────────

    public UserRank() {}

    public UserRank(String userId, String username) {
        this.userId   = userId;
        this.username = username;
    }

    // ── Getters / Setters ──────────────────────────────────────

    public String getUserId()           { return userId; }
    public void   setUserId(String v)   { this.userId = v; }

    public String getUsername()         { return username; }
    public void   setUsername(String v) { this.username = v; }

    public long   getTotalXp()          { return totalXp; }
    public void   setTotalXp(long v)    { this.totalXp = v; }

    public int    getPrestigeCount()       { return prestigeCount; }
    public void   setPrestigeCount(int v)  { this.prestigeCount = v; }

    public Rank   getCurrentRank()         { return currentRank; }
    public void   setCurrentRank(Rank v)   { this.currentRank = v; }

    public long   getLastUpdatedMs()          { return lastUpdatedMs; }
    public void   setLastUpdatedMs(long v)    { this.lastUpdatedMs = v; }

    public long   getLastSeasonResetMs()      { return lastSeasonResetMs; }
    public void   setLastSeasonResetMs(long v){ this.lastSeasonResetMs = v; }

    // ── Business helpers ───────────────────────────────────────

    /** Recalculates currentRank from totalXp and updates timestamp. */
    public void recalcRank() {
        this.currentRank  = Rank.forXp(this.totalXp);
        this.lastUpdatedMs = System.currentTimeMillis();
    }

    /** XP still needed for the next rank tier (0 if already at Demon King). */
    public long xpToNextRank() {
        Rank next = currentRank.next();
        return next == null ? 0 : next.xpRequired - totalXp;
    }

    /** Progress 0.0 – 1.0 within the current rank tier. */
    public double progressInCurrentRank() {
        Rank next = currentRank.next();
        if (next == null) return 1.0;
        long tierStart = currentRank.xpRequired;
        long tierEnd   = next.xpRequired;
        return (double)(totalXp - tierStart) / (tierEnd - tierStart);
    }
}
