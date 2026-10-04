package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashSet;
import java.util.List;

public record ViewConfig(
        @NotEmpty List<@NotBlank String> cityIds,
        @NotNull PeriodRange period,
        @NotEmpty List<@NotNull Metric> metrics,
        @NotNull @Valid DashboardSettings dashboard) {

    /** Same configuration with trimmed city ids and without duplicate cities/metrics (order preserved). */
    public ViewConfig normalized() {
        List<String> ids = List.copyOf(new LinkedHashSet<>(cityIds.stream().map(String::trim).toList()));
        List<Metric> distinctMetrics = List.copyOf(new LinkedHashSet<>(metrics));
        return new ViewConfig(ids, period, distinctMetrics, dashboard);
    }
}
