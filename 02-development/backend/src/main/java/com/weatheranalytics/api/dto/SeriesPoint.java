package com.weatheranalytics.api.dto;

import java.time.LocalDate;

public record SeriesPoint(LocalDate date, MetricValues values) {
}
