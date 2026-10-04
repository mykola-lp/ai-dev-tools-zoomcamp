package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.Severity;

public record Anomaly(
        String type,
        String cityId,
        Metric metric,
        Severity severity,
        double value,
        double baseline,
        double difference,
        String message) {

    public static final String TYPE = "anomaly";

    public static Anomaly of(String cityId, Metric metric, Severity severity,
                             double value, double baseline, double difference, String message) {
        return new Anomaly(TYPE, cityId, metric, severity, value, baseline, difference, message);
    }
}
