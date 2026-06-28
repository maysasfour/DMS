package com.dms.shelter;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ShelterRepository extends JpaRepository<Shelter, Long> {
    List<Shelter> findByIsActiveTrue();
    Page<Shelter> findByIsActive(Boolean isActive, Pageable pageable);

    @Query("SELECT s FROM Shelter s WHERE s.isActive = true AND s.availableCapacity > 0")
    List<Shelter> findAvailableShelters();

    @Query("SELECT s FROM Shelter s WHERE s.latitude BETWEEN :minLat AND :maxLat AND s.longitude BETWEEN :minLon AND :maxLon AND s.isActive = true")
    List<Shelter> findNearby(double minLat, double maxLat, double minLon, double maxLon);
}
