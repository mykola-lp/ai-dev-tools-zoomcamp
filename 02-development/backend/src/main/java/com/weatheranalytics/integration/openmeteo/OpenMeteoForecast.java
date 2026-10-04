package com.weatheranalytics.integration.openmeteo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Open-Meteo `/v1/forecast` response model (only the fields we request). External wire model:
 * never exposed through the application API.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenMeteoForecast(Current current, Daily daily) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Current(
            String time,
            @JsonProperty("temperature_2m") Double temperature2m,
            @JsonProperty("apparent_temperature") Double apparentTemperature,
            @JsonProperty("precipitation") Double precipitation,
            @JsonProperty("wind_speed_10m") Double windSpeed10m,
            @JsonProperty("relative_humidity_2m") Double relativeHumidity2m,
            @JsonProperty("surface_pressure") Double surfacePressure,
            @JsonProperty("snowfall") Double snowfall,
            @JsonProperty("weather_code") Integer weatherCode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Daily(
            List<String> time,
            @JsonProperty("temperature_2m_mean") List<Double> temperature2mMean,
            @JsonProperty("apparent_temperature_mean") List<Double> apparentTemperatureMean,
            @JsonProperty("precipitation_sum") List<Double> precipitationSum,
            @JsonProperty("wind_speed_10m_mean") List<Double> windSpeed10mMean,
            @JsonProperty("relative_humidity_2m_mean") List<Double> relativeHumidity2mMean,
            @JsonProperty("surface_pressure_mean") List<Double> surfacePressureMean,
            @JsonProperty("snowfall_sum") List<Double> snowfallSum,
            @JsonProperty("weather_code") List<Integer> weatherCode) {
    }
}
