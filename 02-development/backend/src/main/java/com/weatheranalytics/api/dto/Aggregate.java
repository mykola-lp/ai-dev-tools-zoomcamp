package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;

/** `sum` is null for metrics where a total is meaningless (e.g. temperature). */
public record Aggregate(String cityId, Metric metric, double avg, double min, double max, Double sum) {
}
