package com.dms.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
                "dashboardStats",   // 30s TTL — changes on every incident/user action
                "activeAlerts",     // 30s TTL — updated infrequently
                "shelterList",      // 60s TTL — rarely changes
                "resourceList"      // 30s TTL — changes on assignment
        );
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(30, TimeUnit.SECONDS)
                .maximumSize(500));
        return manager;
    }
}
