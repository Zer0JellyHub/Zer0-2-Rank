package dev.zer0rank.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface UserRankRepository extends JpaRepository<UserRank, String> {

    /**
     * Full leaderboard: sorted by prestige desc, then XP desc.
     */
    @Query("SELECT u FROM UserRank u ORDER BY u.prestigeCount DESC, u.totalXp DESC")
    List<UserRank> findLeaderboard();
}
