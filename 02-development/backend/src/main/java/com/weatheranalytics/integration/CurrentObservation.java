package com.weatheranalytics.integration;

import com.weatheranalytics.domain.WeatherValues;
import java.time.Instant;

public record CurrentObservation(Instant observedAt, WeatherValues values) {
}
