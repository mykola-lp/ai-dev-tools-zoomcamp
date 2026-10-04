package com.weatheranalytics.domain;

/** One weather observation / daily aggregate in application units (°C, mm, km/h, %, hPa, cm). */
public record WeatherValues(
        double temperature,
        double apparentTemperature,
        double precipitation,
        double windSpeed,
        double humidity,
        double pressure,
        double snowfall,
        int weatherCode) {
}
