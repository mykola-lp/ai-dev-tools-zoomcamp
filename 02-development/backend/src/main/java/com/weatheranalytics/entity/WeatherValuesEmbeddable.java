package com.weatheranalytics.entity;

import com.weatheranalytics.domain.WeatherValues;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class WeatherValuesEmbeddable {

    @Column(name = "temperature", nullable = false)
    private double temperature;
    @Column(name = "apparent_temperature", nullable = false)
    private double apparentTemperature;
    @Column(name = "precipitation", nullable = false)
    private double precipitation;
    @Column(name = "wind_speed", nullable = false)
    private double windSpeed;
    @Column(name = "humidity", nullable = false)
    private double humidity;
    @Column(name = "pressure", nullable = false)
    private double pressure;
    @Column(name = "snowfall", nullable = false)
    private double snowfall;
    @Column(name = "weather_code", nullable = false)
    private int weatherCode;

    protected WeatherValuesEmbeddable() {
    }

    public static WeatherValuesEmbeddable from(WeatherValues v) {
        WeatherValuesEmbeddable e = new WeatherValuesEmbeddable();
        e.temperature = v.temperature();
        e.apparentTemperature = v.apparentTemperature();
        e.precipitation = v.precipitation();
        e.windSpeed = v.windSpeed();
        e.humidity = v.humidity();
        e.pressure = v.pressure();
        e.snowfall = v.snowfall();
        e.weatherCode = v.weatherCode();
        return e;
    }

    public WeatherValues toDomain() {
        return new WeatherValues(temperature, apparentTemperature, precipitation, windSpeed,
                humidity, pressure, snowfall, weatherCode);
    }
}
