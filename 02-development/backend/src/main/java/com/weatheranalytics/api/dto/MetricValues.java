package com.weatheranalytics.api.dto;

public record MetricValues(
        double temperature,
        double apparentTemperature,
        double precipitation,
        double windSpeed,
        double humidity,
        double pressure,
        double snowfall,
        int weatherCode) {
}
