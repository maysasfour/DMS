/**
 * DmsApplication.java
 *
 * Entry point for the Disaster Management System (DMS) backend application.
 * This class bootstraps the Spring Boot application, enables caching for
 * performance-critical operations (e.g., incident lookups, user sessions),
 * and configures the OpenAPI/Swagger documentation with JWT security support
 * for all REST API endpoints used by responders, administrators, and field teams.
 */
package com.dms;

// OpenAPI/Swagger annotations for documenting the REST API and its security model
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

// Spring Boot core imports for application startup and auto-configuration
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Enables Spring's annotation-driven caching abstraction (e.g., @Cacheable on service methods)
import org.springframework.cache.annotation.EnableCaching;

// Marks this as a Spring Boot application: triggers component scan, auto-configuration, and property loading
@SpringBootApplication

// Activates Spring caching support — used to cache frequently accessed DMS data such as incident lists and resource availability
@EnableCaching

// Defines the OpenAPI 3.0 metadata shown in the Swagger UI for all DMS REST endpoints
@OpenAPIDefinition(
        info = @Info(
                // Human-readable API title shown in Swagger UI
                title = "Disaster Management System API",
                // API version aligned with DMS release versioning
                version = "1.0.0",
                // Brief description of the API's purpose: incident reporting, resource management, and RBAC
                description = "REST API for Disaster Management System with role-based access control",
                // Support contact for API consumers (field teams, integrators)
                contact = @Contact(
                        name = "DMS Team",
                        email = "support@dms.com"
                ),
                // Open-source license governing API usage and distribution
                license = @License(
                        name = "Apache 2.0",
                        url = "https://www.apache.org/licenses/LICENSE-2.0.html"
                )
        )
)

// Registers a JWT Bearer security scheme so Swagger UI can authorize API calls on behalf of authenticated DMS users
@SecurityScheme(
        // Name referenced by @SecurityRequirement annotations on individual API operations
        name = "Bearer Authentication",
        // HTTP-type scheme (as opposed to API key or OAuth2 flow)
        type = SecuritySchemeType.HTTP,
        // Uses the "bearer" HTTP authentication scheme
        scheme = "bearer",
        // Specifies that the token format is JWT, issued upon DMS login
        bearerFormat = "JWT",
        // Instruction shown to developers in Swagger UI
        description = "Enter JWT token",
        // Token is passed in the HTTP Authorization request header
        in = SecuritySchemeIn.HEADER
)
public class DmsApplication {

    /**
     * Application entry point.
     * Launches the Spring Boot context, initializes all DMS components
     * (controllers, services, repositories, security filters), and starts
     * the embedded web server to serve the DMS REST API.
     *
     * @param args command-line arguments passed at startup (e.g., Spring profile overrides)
     */
    public static void main(String[] args) {
        // Bootstraps the entire DMS Spring application context and starts the embedded Tomcat server
        SpringApplication.run(DmsApplication.class, args);
    }

}