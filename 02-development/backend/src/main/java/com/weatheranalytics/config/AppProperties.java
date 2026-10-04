package com.weatheranalytics.config;

import com.weatheranalytics.domain.DataCategory;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Auth auth, Weather weather, Seed seed, Dashboard dashboard) {

    public record Auth(Duration tokenTtl, String cookieName, boolean cookieSecure) {
    }

    public record Weather(String openMeteoBaseUrl, Duration timeout, MinAge minAge, Scheduler scheduler) {
    }

    /** Minimum time between two upstream refreshes of a category. */
    public record MinAge(Duration current, Duration forecast, Duration historical) {
        public Duration forCategory(DataCategory category) {
            return switch (category) {
                case CURRENT -> current;
                case FORECAST -> forecast;
                case HISTORICAL -> historical;
            };
        }
    }

    public record Scheduler(boolean enabled, Duration initialDelay, Duration interval) {
    }

    public record Seed(boolean enabled, String demoEmail, String demoPassword) {
    }

    public record Dashboard(List<String> defaultCityIds) {
    }
}
