package com.weatheranalytics.domain;

import java.time.Instant;

public record CityCurrent(String cityId, Instant observedAt, WeatherValues values) {
}
