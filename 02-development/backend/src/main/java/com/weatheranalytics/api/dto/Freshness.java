package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.DataCategory;
import java.time.Instant;

public record Freshness(DataCategory category, Instant lastUpdated) {
}
