package com.weatheranalytics.api.dto;

import java.util.List;

public record AnalysisResult(
        List<Aggregate> aggregates,
        List<Anomaly> anomalies,
        List<Trend> trends,
        List<String> insights) {
}
