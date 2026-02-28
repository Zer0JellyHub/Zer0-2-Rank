package dev.zer0rank.model;

/**
 * All 15 ranks from Bronze to Demon King.
 * XP thresholds mirror the original Zer0-2-Rank plugin.
 */
public enum Rank {

    BRONZE      ("Bronze",      "\uD83E\uDD49", 0),
    SILVER      ("Silver",      "\uD83E\uDD48", 50_000),
    GOLD        ("Gold",        "\uD83E\uDD47", 150_000),
    PLATINUM    ("Platinum",    "\uD83D\uDCA0", 350_000),
    RUBY        ("Ruby",        "\u2666\uFE0F",  700_000),
    EMERALD     ("Emerald",     "\u2747\uFE0F",  1_200_000),
    OBSIDIAN    ("Obsidian",    "\uD83D\uDD2E", 2_000_000),
    MYTHRIL     ("Mythril",     "\u2728",        3_500_000),
    ADAMANT     ("Adamant",     "\uD83D\uDC8E", 4_500_000),
    GRANDMASTER ("Grandmaster", "\uD83C\uDF1F", 5_000_000),
    KING        ("King",        "\uD83D\uDC51", 5_400_000),
    LEGEND      ("Legend",      "\uD83D\uDC26\u200D\uD83D\uDD25", 5_700_000),
    CHAMPION    ("Champion",    "\uD83C\uDFC6", 5_900_000),
    GOD         ("God",         "\u26A1",        5_980_000),
    DEMON_KING  ("Demon King",  "\uD83D\uDE08", 6_000_000);

    public final String displayName;
    public final String icon;
    public final long   xpRequired;

    Rank(String displayName, String icon, long xpRequired) {
        this.displayName = displayName;
        this.icon        = icon;
        this.xpRequired  = xpRequired;
    }

    /** Returns the highest rank the user qualifies for at the given XP. */
    public static Rank forXp(long xp) {
        Rank result = BRONZE;
        for (Rank r : values()) {
            if (xp >= r.xpRequired) result = r;
            else break;
        }
        return result;
    }

    /** Next rank, or null when already at Demon King. */
    public Rank next() {
        int idx = this.ordinal() + 1;
        Rank[] all = values();
        return idx < all.length ? all[idx] : null;
    }
}
