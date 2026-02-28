package dev.zer0rank.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * All runtime-configurable settings.
 * Bound from application.properties at startup.
 * XP settings can also be changed at runtime via POST /WatchRanks/Config.
 */
@ConfigurationProperties(prefix = "zer0rank")
public class RankConfig {

    private String jellyfinUrl    = "http://localhost:8096";
    private String jellyfinApiKey = "";
    private Playback playback     = new Playback();
    private Xp       xp          = new Xp();
    private Ranks    ranks        = new Ranks();

    // ── Nested classes ─────────────────────────────────────────

    public static class Playback {
        /** Full path to the Playback Reporting plugin SQLite database. */
        private String dbPath = "/var/lib/jellyfin/data/playback_reporting.db";
        public String getDbPath()         { return dbPath; }
        public void   setDbPath(String v) { this.dbPath = v; }
    }

    public static class Xp {
        // Base XP
        private int    perMinute             = 2;
        private int    perEpisode            = 20;
        private int    perMovie              = 20;
        private double completionThreshold   = 0.80;
        private int    episodeMinWatchSeconds = 900;
        private int    movieMinWatchSeconds   = 2700;

        // Binge Bonus
        private boolean bingeEnabled             = true;
        private double  bingeThresholdHours      = 3.0;
        private int     bingeXpBonus             = 500;
        private int     bingeGapToleranceSeconds = 600;

        public int    getPerMinute()               { return perMinute; }
        public void   setPerMinute(int v)          { this.perMinute = v; }
        public int    getPerEpisode()              { return perEpisode; }
        public void   setPerEpisode(int v)         { this.perEpisode = v; }
        public int    getPerMovie()                { return perMovie; }
        public void   setPerMovie(int v)           { this.perMovie = v; }
        public double getCompletionThreshold()     { return completionThreshold; }
        public void   setCompletionThreshold(double v) { this.completionThreshold = v; }
        public int    getEpisodeMinWatchSeconds()  { return episodeMinWatchSeconds; }
        public void   setEpisodeMinWatchSeconds(int v) { this.episodeMinWatchSeconds = v; }
        public int    getMovieMinWatchSeconds()    { return movieMinWatchSeconds; }
        public void   setMovieMinWatchSeconds(int v)   { this.movieMinWatchSeconds = v; }

        public boolean isBingeEnabled()               { return bingeEnabled; }
        public void    setBingeEnabled(boolean v)     { this.bingeEnabled = v; }
        public double  getBingeThresholdHours()       { return bingeThresholdHours; }
        public void    setBingeThresholdHours(double v){ this.bingeThresholdHours = v; }
        public int     getBingeXpBonus()              { return bingeXpBonus; }
        public void    setBingeXpBonus(int v)         { this.bingeXpBonus = v; }
        public int     getBingeGapToleranceSeconds()  { return bingeGapToleranceSeconds; }
        public void    setBingeGapToleranceSeconds(int v){ this.bingeGapToleranceSeconds = v; }
    }

    public static class Ranks {
        private boolean prestigeEnabled     = true;
        private boolean showLeaderboard     = true;
        private String  seasonCarryoverRank = "Platinum";

        public boolean isPrestigeEnabled()           { return prestigeEnabled; }
        public void    setPrestigeEnabled(boolean v) { this.prestigeEnabled = v; }
        public boolean isShowLeaderboard()           { return showLeaderboard; }
        public void    setShowLeaderboard(boolean v) { this.showLeaderboard = v; }
        public String  getSeasonCarryoverRank()      { return seasonCarryoverRank; }
        public void    setSeasonCarryoverRank(String v){ this.seasonCarryoverRank = v; }
    }

    // ── Root getters/setters ───────────────────────────────────

    public String   getJellyfinUrl()          { return jellyfinUrl; }
    public void     setJellyfinUrl(String v)  { this.jellyfinUrl = v; }
    public String   getJellyfinApiKey()       { return jellyfinApiKey; }
    public void     setJellyfinApiKey(String v){ this.jellyfinApiKey = v; }
    public Playback getPlayback()             { return playback; }
    public void     setPlayback(Playback v)   { this.playback = v; }
    public Xp       getXp()                   { return xp; }
    public void     setXp(Xp v)              { this.xp = v; }
    public Ranks    getRanks()                { return ranks; }
    public void     setRanks(Ranks v)         { this.ranks = v; }
}
