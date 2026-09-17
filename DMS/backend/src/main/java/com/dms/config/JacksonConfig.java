/**
 * JacksonConfig.java
 *
 * Jackson ObjectMapper configuration for the Disaster Management System (DMS).
 *
 * This configuration ensures that REST API responses serialize DMS domain objects
 * (incidents, users, resources, alerts) correctly, handling two common pitfalls:
 *
 * 1. Hibernate lazy-loading proxies: JPA entities in DMS (e.g., Incident, Resource)
 *    use lazy-loaded associations. Without special handling, Jackson would throw
 *    errors or infinite-loop when serializing uninitialized proxies. The Hibernate6Module
 *    instructs Jackson to serialize the proxy's identifier instead of failing.
 *
 * 2. Java 8 date/time types (LocalDateTime, ZonedDateTime, Instant): DMS records
 *    incident timestamps, alert times, and resource availability windows using the
 *    modern java.time API. The JavaTimeModule serializes these as ISO-8601 strings
 *    (e.g., "2026-07-11T10:30:00Z") rather than raw numeric timestamps, making
 *    API responses readable and interoperable with the React frontend and mobile clients.
 */
package com.dms.config;

// Jackson core: ObjectMapper is the central serialization/deserialization engine
import com.fasterxml.jackson.databind.ObjectMapper;
// Controls optional serialization behaviors (e.g., date format)
import com.fasterxml.jackson.databind.SerializationFeature;
// Bridges Jackson with Hibernate 6 lazy-loading proxies used by JPA entities
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
// Adds serialization support for java.time types (LocalDateTime, Instant, etc.)
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
// Marks this class as a Spring-managed configuration source
import org.springframework.context.annotation.Bean;
// Tells Spring to process this class for @Bean definitions at startup
import org.springframework.context.annotation.Configuration;

// @Configuration: marks this class as a source of Spring bean definitions;
// Spring processes it at startup and registers any @Bean methods into the application context.
@Configuration
public class JacksonConfig {

    // @Bean: tells Spring to manage the returned ObjectMapper as a singleton bean,
    // replacing Spring Boot's default auto-configured ObjectMapper throughout the DMS application.
    @Bean
    public ObjectMapper objectMapper() {
        // Create a fresh ObjectMapper that will be customized for DMS serialization needs
        ObjectMapper mapper = new ObjectMapper();

        // --- Hibernate Lazy-Proxy Handling ---
        // DMS entities (Incident, User, Resource, Alert) use JPA lazy associations.
        // Without this module, Jackson throws LazyInitializationException or
        // enters infinite recursion when serializing unloaded proxy objects.
        Hibernate6Module hibernateModule = new Hibernate6Module();
        // Disable USE_TRANSIENT_ANNOTATION so fields marked @Transient in JPA
        // are not automatically excluded from JSON output — allows explicit control
        // over which transient fields (e.g., computed incident severity) appear in responses.
        hibernateModule.disable(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION);
        // When a lazy-loaded association (e.g., Incident.assignedTeam) is not initialized,
        // serialize only its database identifier instead of throwing an error or fetching eagerly.
        // This keeps API responses lightweight and avoids N+1 query problems.
        hibernateModule.enable(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS);
        // Register the configured Hibernate module so the ObjectMapper applies these rules
        // whenever it serializes any Hibernate-managed DMS entity.
        mapper.registerModule(hibernateModule);

        // --- Java 8 Date/Time Handling ---
        // DMS uses java.time types (e.g., LocalDateTime for incident report times,
        // Instant for alert timestamps). Register the JSR-310 module so Jackson
        // knows how to serialize/deserialize these modern date types.
        mapper.registerModule(new JavaTimeModule());
        // Disable writing dates as numeric timestamps (epoch millis).
        // With this disabled, dates are written as ISO-8601 strings (e.g., "2026-07-11T10:30:00"),
        // which is human-readable and directly usable by the React frontend date libraries.
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Return the fully configured ObjectMapper; Spring will inject it wherever
        // ObjectMapper is autowired in DMS controllers, services, and filters.
        return mapper;
    }
}