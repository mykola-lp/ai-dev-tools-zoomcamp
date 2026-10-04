package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.DataCategory;
import java.time.Instant;

public record RefreshResult(DataCategory category, Instant lastUpdated, boolean fetchedFromSource) {
}
