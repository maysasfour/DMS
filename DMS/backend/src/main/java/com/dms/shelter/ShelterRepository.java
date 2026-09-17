// ============================================================
// File: ShelterRepository.java
// Module: Shelter Management — Disaster Management System (DMS)
//
// Purpose: Data access interface for Shelter entities. Provides
// CRUD operations (via JpaRepository) and custom queries to
// locate active shelters, find shelters with available capacity,
// and perform bounding-box geospatial lookups during disaster
// response operations. Used by ShelterService to serve both
// the public-facing incident response portal and the admin dashboard.
// ============================================================

package com.dms.shelter;

// Spring Data pagination support — used for admin listing endpoints that need paged results
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// JpaRepository provides built-in CRUD methods (save, findById, delete, etc.) backed by JPA/Hibernate
import org.springframework.data.jpa.repository.JpaRepository;

// @Query allows writing JPQL queries directly on repository methods when derived query names are insufficient
import org.springframework.data.jpa.repository.Query;

// Standard Java list for returning multiple shelter results from simple queries
import java.util.List;

/**
 * Repository interface for {@link Shelter} entities in the DMS.
 *
 * Extends JpaRepository to inherit standard persistence operations
 * (create, read, update, delete, count, etc.) with Shelter as the
 * entity type and Long as its primary key type.
 *
 * Custom methods support active-shelter filtering and geospatial
 * bounding-box searches critical during active disaster events.
 */
public interface ShelterRepository extends JpaRepository<Shelter, Long> {

    // Derived query: Spring Data auto-generates SQL to return only shelters
    // where isActive = true — used to display operational shelters to displaced persons
    List<Shelter> findByIsActiveTrue();

    // Pageable overload: returns active/inactive shelters in pages for the admin
    // shelter management table; Boolean allows filtering by both states
    Page<Shelter> findByIsActive(Boolean isActive, Pageable pageable);

    // Custom JPQL query: finds shelters that are both active (operational) AND
    // have remaining capacity (availableCapacity > 0) — prevents directing
    // disaster victims to full or closed shelters during emergency dispatch
    @Query("SELECT s FROM Shelter s WHERE s.isActive = true AND s.availableCapacity > 0")
    List<Shelter> findAvailableShelters();

    // Custom JPQL geospatial query: returns active shelters whose GPS coordinates
    // fall within a lat/lon bounding box. Called by the map view and incident
    // response module to surface nearby shelters relative to a disaster site.
    // Parameters: minLat/maxLat define the latitude band; minLon/maxLon the longitude band.
    @Query("SELECT s FROM Shelter s WHERE s.latitude BETWEEN :minLat AND :maxLat AND s.longitude BETWEEN :minLon AND :maxLon AND s.isActive = true")
    List<Shelter> findNearby(double minLat, double maxLat, double minLon, double maxLon);
}