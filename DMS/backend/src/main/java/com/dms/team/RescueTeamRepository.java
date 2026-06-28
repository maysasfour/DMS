package com.dms.team;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RescueTeamRepository extends JpaRepository<RescueTeam, Long> {
    List<RescueTeam> findByIsActiveTrueAndAvailableTrue();
    List<RescueTeam> findByType(String type);
    List<RescueTeam> findByIsActiveTrue();
}
