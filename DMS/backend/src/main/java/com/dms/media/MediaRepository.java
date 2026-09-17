/**
 * MediaRepository.java
 *
 * Spring Data JPA repository interface for managing Media entities in the DMS.
 * Provides database access for media files (images, documents, etc.) attached
 * to disaster incidents. Supports retrieval of all media associated with a
 * specific incident, enabling officers and admins to review evidence and
 * reports uploaded during incident reporting workflows.
 */
package com.dms.media;

// Spring Data JPA: provides generic CRUD and query operations for JPA entities
import org.springframework.data.jpa.repository.JpaRepository;

// Marks this interface as a Spring-managed repository bean (enables exception translation and component scanning)
import org.springframework.stereotype.Repository;

// Used as return type for queries that may return multiple Media records
import java.util.List;

// @Repository: designates this interface as a data access component; Spring will create a proxy implementation at runtime
@Repository
// Extends JpaRepository to inherit built-in CRUD methods (save, findById, findAll, delete, etc.)
// Generic parameters: Media = the entity type, Long = the type of the primary key (mediaId)
public interface MediaRepository extends JpaRepository<Media, Long> {

    // Custom derived query: fetches all Media records linked to a specific incident
    // Spring Data JPA parses the method name and generates the SQL:
    //   SELECT * FROM media WHERE incident_incident_id = :incidentId
    // Used when loading the detail view of a disaster incident to display all attached media files
    List<Media> findByIncident_IncidentId(Long incidentId);
}