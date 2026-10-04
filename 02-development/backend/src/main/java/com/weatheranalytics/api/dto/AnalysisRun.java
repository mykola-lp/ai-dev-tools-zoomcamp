package com.weatheranalytics.api.dto;

import java.time.Instant;
import java.util.List;

/** Immutable analysis snapshot. */
public record AnalysisRun(
        String id,
        String userId,
        Instant createdAt,
        ViewConfig config,
        List<City> cities,
        String dataVersion,
        AnalysisResult result) {
}
