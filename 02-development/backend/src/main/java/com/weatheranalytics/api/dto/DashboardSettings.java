package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.ChartType;
import jakarta.validation.constraints.NotNull;

public record DashboardSettings(
        @NotNull ChartType chartType,
        @NotNull Boolean showTable,
        @NotNull Boolean showInsights) {
}
