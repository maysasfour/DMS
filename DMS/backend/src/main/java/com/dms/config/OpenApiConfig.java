/**
 * OpenApiConfig.java
 *
 * Configuration class for the OpenAPI (Swagger) documentation of the Disaster Management System (DMS) REST API.
 *
 * This file sets up the interactive API documentation available at /swagger-ui.html, providing:
 * - Metadata about the DMS API (title, version, description, contact)
 * - Server definitions for local development
 * - JWT Bearer token security scheme so that protected endpoints (incidents, users, resources, alerts)
 *   can be tested directly from the Swagger UI after authenticating via /api/v1/auth/login
 *
 * No bean methods are needed — all configuration is expressed through class-level annotations
 * processed by the springdoc-openapi library at application startup.
 */
package com.dms.config;

// --- OpenAPI / Swagger annotation imports ---
// Core annotation to define the global OpenAPI specification metadata
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
// Enum specifying where the security credential is placed (e.g., HTTP header)
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
// Enum specifying the security scheme type (e.g., HTTP, API key, OAuth2)
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
// Annotation for embedding contact information in the API info block
import io.swagger.v3.oas.annotations.info.Contact;
// Annotation for defining general API info (title, version, description)
import io.swagger.v3.oas.annotations.info.Info;
// Annotation to declare which security scheme applies globally to all DMS endpoints
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
// Annotation to define a named security scheme (here: JWT Bearer Auth)
import io.swagger.v3.oas.annotations.security.SecurityScheme;
// Annotation to declare the base server URL for the DMS backend
import io.swagger.v3.oas.annotations.servers.Server;

// Spring stereotype annotation that marks this class as a configuration source
import org.springframework.context.annotation.Configuration;

// Marks this class as a Spring configuration class — Spring will process it on startup
@Configuration

// Declares the top-level OpenAPI specification for the DMS REST API
@OpenAPIDefinition(
    // API metadata block shown at the top of the Swagger UI page
    info = @Info(
        // Human-readable title identifying this as the DMS platform API
        title = "Disaster Management System API",
        // Semantic version of the API; increment when breaking changes are introduced
        version = "1.0.0",
        // Explains how to authenticate: log in first, then authorize in Swagger UI with the returned token
        description = "REST API for the DMS platform. Login via POST /api/v1/auth/login, then click Authorize and paste the token.",
        // Contact info for the DMS development/support team shown in the API docs
        contact = @Contact(name = "DMS Team", email = "admin@dms.com")
    ),
    // Defines the base server URL used by Swagger UI to send test requests during local development
    servers = @Server(url = "http://localhost:9090", description = "Local Development"),
    // Applies the "bearerAuth" security scheme globally — all DMS endpoints require a valid JWT by default
    security = @SecurityRequirement(name = "bearerAuth")
)

// Defines the "bearerAuth" JWT security scheme referenced above, enabling the "Authorize" button in Swagger UI
@SecurityScheme(
    // The logical name used to reference this scheme in @SecurityRequirement and @Operation annotations
    name = "bearerAuth",
    // HTTP-type security scheme (as opposed to API key or OAuth2 flows)
    type = SecuritySchemeType.HTTP,
    // Uses the standard "bearer" HTTP authentication scheme
    scheme = "bearer",
    // Informs Swagger UI that the token format is JWT, enabling helpful UI hints
    bearerFormat = "JWT",
    // The JWT token is transmitted in the HTTP Authorization request header
    in = SecuritySchemeIn.HEADER,
    // User-facing instruction: paste only the raw token value, not the "Bearer " prefix
    description = "Paste your JWT token (without 'Bearer ' prefix). Get it from POST /api/v1/auth/login"
)
// Empty configuration class — all OpenAPI setup is declarative via the annotations above
public class OpenApiConfig {
}