package com.weatheranalytics.api.dto;

import java.time.Instant;

public record CurrentWeather(String cityId, Instant observedAt, MetricValues values) {
}
