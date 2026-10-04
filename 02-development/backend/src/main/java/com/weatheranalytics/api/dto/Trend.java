package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.TrendDirection;
import com.weatheranalytics.domain.TrendStrength;

public record Trend(
        String cityId,
        Metric metric,
        TrendDirection direction,
        TrendStrength strength,
        double slopePerDay,
        String message) {
}
