package com.weatheranalytics.service;

import com.weatheranalytics.domain.DataCategory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Periodically pulls fresh data from upstream; each category's minimum age is still honoured. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.weather.scheduler.enabled", havingValue = "true")
public class ScheduledWeatherRefresh {

    private static final Logger log = LoggerFactory.getLogger(ScheduledWeatherRefresh.class);

    private final WeatherService weatherService;

    public ScheduledWeatherRefresh(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @Scheduled(initialDelayString = "${app.weather.scheduler.initial-delay}",
            fixedDelayString = "${app.weather.scheduler.interval}")
    public void refreshAll() {
        for (DataCategory category : DataCategory.values()) {
            try {
                var result = weatherService.refresh(category);
                log.info("Scheduled refresh of {}: fetchedFromSource={}", category.value(), result.fetchedFromSource());
            } catch (RuntimeException e) {
                log.warn("Scheduled refresh of {} failed: {}", category.value(), e.getMessage());
            }
        }
    }
}
