package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** last* periods are historical (ending yesterday); next* periods are forecasts (starting tomorrow). */
public enum PeriodRange implements ApiEnum {
    LAST7("last7", 7, DataCategory.HISTORICAL),
    LAST30("last30", 30, DataCategory.HISTORICAL),
    LAST90("last90", 90, DataCategory.HISTORICAL),
    NEXT7("next7", 7, DataCategory.FORECAST),
    NEXT14("next14", 14, DataCategory.FORECAST);

    /** Number of past days the weather cache keeps for the historical category. */
    public static final int MAX_HISTORICAL_DAYS = 90;
    /** Number of future days the weather cache keeps for the forecast category. */
    public static final int MAX_FORECAST_DAYS = 14;

    private final String value;
    private final int days;
    private final DataCategory category;

    PeriodRange(String value, int days, DataCategory category) {
        this.value = value;
        this.days = days;
        this.category = category;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    public int days() {
        return days;
    }

    public DataCategory category() {
        return category;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static PeriodRange fromValue(String value) {
        return ApiEnums.parse(PeriodRange.class, value);
    }
}
