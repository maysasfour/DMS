/**
 * ReportDTO.java
 *
 * Data Transfer Object (DTO) for transferring report data between
 * the DMS backend layers (service, controller) and the frontend or external clients.
 *
 * In the Disaster Management System, reports are used to summarize
 * incidents, resource usage, or operational status. This DTO exposes
 * only the fields needed by API consumers, decoupling the internal
 * domain model from the API contract.
 *
 * Used in REST API responses for report listing and detail endpoints.
 */
package com.dms.report;

// Lombok imports — automatically generate boilerplate Java code at compile time
import lombok.AllArgsConstructor; // Generates a constructor with all fields as parameters
import lombok.Builder;            // Enables the Builder pattern for fluent object construction
import lombok.Data;               // Generates getters, setters, equals, hashCode, and toString
import lombok.NoArgsConstructor;  // Generates a no-argument constructor required by frameworks like Jackson

// Java time API — used to represent the timestamp when a report was created
import java.time.LocalDateTime;

// @Data: Lombok annotation that generates getters/setters, equals, hashCode, and toString for all fields
@Data
// @Builder: Allows constructing ReportDTO instances using a readable builder pattern (e.g., ReportDTO.builder().title("...").build())
@Builder
// @NoArgsConstructor: Generates a default no-arg constructor needed for JSON deserialization by Jackson
@NoArgsConstructor
// @AllArgsConstructor: Generates a constructor accepting all fields, used internally by the @Builder pattern
@AllArgsConstructor
public class ReportDTO {

    // Unique identifier of the report, mapped from the database entity primary key
    private Long id;

    // Human-readable title of the report (e.g., "Flood Incident Summary - July 2026")
    private String title;

    // Category or type of the report (e.g., "INCIDENT", "RESOURCE", "ALERT", "OPERATIONAL")
    private String type;

    // Detailed textual description of the report content, summarizing findings or incident data
    private String description;

    // Timestamp indicating when this report was created in the DMS system
    private LocalDateTime createdAt;
}