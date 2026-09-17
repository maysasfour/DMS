/**
 * WebMvcConfig.java
 *
 * Spring MVC configuration for the Disaster Management System (DMS) backend.
 * This class customizes the default Spring MVC behavior to serve uploaded files
 * (such as incident images, resource photos, and user profile pictures) as static
 * web resources accessible via HTTP. Without this configuration, files saved to
 * the upload directory would not be reachable through the browser or frontend.
 */
package com.dms.config;

// Spring annotation support for injecting values from application.properties
import org.springframework.beans.factory.annotation.Value;
// Marks this class as a source of Spring bean definitions and configuration
import org.springframework.context.annotation.Configuration;
// Registry used to map URL patterns to physical file system resource locations
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
// Interface that allows customizing the Spring MVC configuration without replacing it
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Java NIO utility for resolving and normalizing file system paths portably
import java.nio.file.Paths;

// @Configuration tells Spring to treat this class as a configuration source,
// equivalent to an XML <beans> file — Spring will process it at startup
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    // Injects the upload directory path from application.properties (app.file-upload-dir).
    // Falls back to "uploads/" relative to the working directory if the property is not set.
    // This directory stores incident evidence images, resource attachments, and profile photos.
    @Value("${app.file-upload-dir:uploads/}")
    private String uploadDir;

    /**
     * Registers a resource handler so that files stored in the DMS upload directory
     * can be served directly over HTTP under the /uploads/** URL path.
     * This enables the React frontend to display incident images and other media
     * by requesting URLs like /uploads/incident-photo.jpg.
     *
     * @param registry the Spring MVC resource handler registry to add mappings to
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Convert the (possibly relative) upload directory path to an absolute URI
        // so Spring can locate it regardless of the working directory at runtime
        String absolutePath = Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        // Map all HTTP requests matching /uploads/** to the resolved absolute directory.
        // addResourceHandler sets the URL pattern; addResourceLocations sets the disk location.
        // The trailing "**" wildcard allows serving any file or subdirectory within uploads/.
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(absolutePath);
    }
}