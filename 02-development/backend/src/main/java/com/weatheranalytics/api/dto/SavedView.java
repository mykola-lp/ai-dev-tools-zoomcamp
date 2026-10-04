package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.Visibility;
import java.time.Instant;
import java.util.List;

public record SavedView(
        String id,
        String ownerId,
        String name,
        Visibility visibility,
        List<String> cityIds,
        PeriodRange period,
        List<Metric> metrics,
        DashboardSettings dashboard,
        Instant createdAt,
        Instant updatedAt) {
}
