package com.nigersec.intelligence_backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;

@Slf4j
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Attempt to build a Redis-backed cache manager.
     * If Redis is unavailable at startup, fall back to an in-memory cache
     * so the application boots and works without Redis running.
     */
    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        try {
            // Probe the connection — if Redis is down this throws immediately
            factory.getConnection().ping();

            RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                    .serializeValuesWith(RedisSerializationContext.SerializationPair
                            .fromSerializer(new GenericJackson2JsonRedisSerializer()));

            log.info("Redis available — using Redis cache manager");
            return RedisCacheManager.builder(factory)
                    .cacheDefaults(defaults)
                    .withInitialCacheConfigurations(Map.of(
                            "breach-checks", defaults.entryTtl(Duration.ofMinutes(15)),
                            "threat-feed",   defaults.entryTtl(Duration.ofMinutes(2)),
                            "fraud-scores",  defaults.entryTtl(Duration.ofSeconds(30))
                    ))
                    .build();

        } catch (Exception e) {
            log.warn("Redis unavailable ({}). Falling back to in-memory cache. " +
                     "Start Redis for production-grade caching.", e.getMessage());
            return new ConcurrentMapCacheManager(
                    "breach-checks", "threat-feed", "fraud-scores");
        }
    }
}
