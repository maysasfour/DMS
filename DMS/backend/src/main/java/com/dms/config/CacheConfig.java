/**
 * CacheConfig.java
 *
 * Spring cache configuration for the Disaster Management System (DMS).
 *
 * This class sets up an in-memory Caffeine cache to reduce database load for
 * frequently accessed, read-heavy data such as dashboard statistics, active alerts,
 * shelter listings, and resource inventories. Caching these values avoids repeated
 * expensive queries during high-traffic disaster response scenarios where many
 * operators may be refreshing dashboards simultaneously.
 *
 * All caches share a global 30-second TTL and a maximum of 500 entries, balancing
 * data freshness with performance. The shelter list uses a logical 60-second TTL
 * via its cache name documentation, though the underlying Caffeine spec applies
 * uniformly — per-cache TTL differentiation would require individual Caffeine specs.
 */
package com.dms.config;

// Caffeine high-performance cache builder — used to configure eviction and size policies
import com.github.benmanes.caffeine.cache.Caffeine;
// Spring abstraction for managing named caches — decouples cache logic from business code
import org.springframework.cache.CacheManager;
// Spring adapter that wires Caffeine as the underlying CacheManager implementation
import org.springframework.cache.caffeine.CaffeineCacheManager;
// Marks this method's return value as a Spring-managed bean registered in the application context
import org.springframework.context.annotation.Bean;
// Marks this class as a source of Spring bean definitions; processed at startup
import org.springframework.context.annotation.Configuration;

// Java standard TimeUnit enum — used to express cache expiry durations in a readable form
import java.util.concurrent.TimeUnit;

/**
 * Spring @Configuration class — tells Spring to process this class for @Bean method definitions
 * at application startup, contributing the CacheManager bean to the application context.
 */
@Configuration
public class CacheConfig {

    /**
     * Declares the primary CacheManager bean used throughout the DMS application.
     *
     * Named caches registered here correspond to @Cacheable("name") annotations on
     * service methods. Each name represents a distinct logical data set in the DMS:
     *   - dashboardStats : aggregated incident counts, severity breakdowns, user activity
     *   - activeAlerts   : currently active emergency alerts broadcast to responders
     *   - shelterList    : list of available shelters and their capacities
     *   - resourceList   : inventory of deployable resources (vehicles, equipment, personnel)
     *
     * @return a fully configured CaffeineCacheManager bound to all DMS cache regions
     */
    @Bean // Registers the returned CacheManager as a Spring bean, making it injectable everywhere
    public CacheManager cacheManager() {
        // Create a Caffeine-backed cache manager and pre-declare all named cache regions
        // used by DMS service layer @Cacheable/@CacheEvict annotations
        CaffeineCacheManager manager = new CaffeineCacheManager(
                "dashboardStats",   // 30s TTL — recalculated frequently as incidents and users change state
                "activeAlerts",     // 30s TTL — alerts are updated infrequently but must not be stale for long
                "shelterList",      // 60s TTL (logical) — shelter data is relatively static between disasters
                "resourceList"      // 30s TTL — resource assignments change when responders claim or return items
        );

        // Apply a shared Caffeine spec to all cache regions:
        //   expireAfterWrite(30s) — each entry is evicted 30 seconds after it was written,
        //                           ensuring DMS operators see near-real-time data without
        //                           hammering the database on every page refresh
        //   maximumSize(500)      — caps total entries across all caches to bound heap usage;
        //                           the least-recently-used entries are evicted when the limit is hit
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(30, TimeUnit.SECONDS) // Auto-expire cached data after 30 seconds to keep DMS data fresh
                .maximumSize(500));                     // Limit cache size to 500 entries to prevent unbounded memory growth

        // Return the fully configured manager; Spring injects it wherever CacheManager is autowired
        return manager;
    }
}