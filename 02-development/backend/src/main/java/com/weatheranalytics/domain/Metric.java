package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.function.ToDoubleFunction;

/**
 * Weather metrics exposed by the API, together with the analytics rules that apply to each of them.
 */
public enum Metric implements ApiEnum {
    TEMPERATURE("temperature", "temperature", "°C", false, false, 3.0, 1.0, WeatherValues::temperature),
    APPARENT_TEMPERATURE("apparentTemperature", "feels-like temperature", "°C", false, false, 3.0, 1.0,
            WeatherValues::apparentTemperature),
    PRECIPITATION("precipitation", "precipitation", "mm", true, false, 5.0, 1.0, WeatherValues::precipitation),
    WIND_SPEED("windSpeed", "wind speed", "km/h", false, false, 10.0, 2.0, WeatherValues::windSpeed),
    HUMIDITY("humidity", "humidity", "%", false, false, 15.0, 3.0, WeatherValues::humidity),
    PRESSURE("pressure", "pressure", "hPa", false, false, 8.0, 2.0, WeatherValues::pressure),
    SNOWFALL("snowfall", "snowfall", "cm", true, false, 2.0, 0.5, WeatherValues::snowfall),
    WEATHER_CODE("weatherCode", "weather code", "", false, true, 0.0, 0.0, v -> (double) v.weatherCode());

    private final String value;
    private final String label;
    private final String unit;
    private final boolean summable;
    private final boolean categorical;
    private final double anomalyMinDiff;
    private final double trendMinChange;
    private final ToDoubleFunction<WeatherValues> extractor;

    Metric(String value, String label, String unit, boolean summable, boolean categorical,
           double anomalyMinDiff, double trendMinChange, ToDoubleFunction<WeatherValues> extractor) {
        this.value = value;
        this.label = label;
        this.unit = unit;
        this.summable = summable;
        this.categorical = categorical;
        this.anomalyMinDiff = anomalyMinDiff;
        this.trendMinChange = trendMinChange;
        this.extractor = extractor;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    public String label() {
        return label;
    }

    public String unit() {
        return unit;
    }

    /** True when a total over the period is meaningful (precipitation, snowfall). */
    public boolean summable() {
        return summable;
    }

    /** Categorical metrics (weather code) get aggregates only - no anomalies or trends. */
    public boolean categorical() {
        return categorical;
    }

    /** Minimum absolute deviation from the baseline for a point to count as an anomaly. */
    public double anomalyMinDiff() {
        return anomalyMinDiff;
    }

    /** Minimum total change over the period for a trend to be reported as up/down instead of flat. */
    public double trendMinChange() {
        return trendMinChange;
    }

    public double extract(WeatherValues values) {
        return extractor.applyAsDouble(values);
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static Metric fromValue(String value) {
        return ApiEnums.parse(Metric.class, value);
    }
}
