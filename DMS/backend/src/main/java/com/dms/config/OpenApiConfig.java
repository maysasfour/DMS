package com.dms.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Disaster Management System API",
        version = "1.0.0",
        description = "REST API for the DMS platform. Login via POST /api/v1/auth/login, then click Authorize and paste the token.",
        contact = @Contact(name = "DMS Team", email = "admin@dms.com")
    ),
    servers = @Server(url = "http://localhost:9090", description = "Local Development"),
    security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    in = SecuritySchemeIn.HEADER,
    description = "Paste your JWT token (without 'Bearer ' prefix). Get it from POST /api/v1/auth/login"
)
public class OpenApiConfig {
}
