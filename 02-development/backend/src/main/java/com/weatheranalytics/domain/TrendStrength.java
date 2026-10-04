package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TrendStrength implements ApiEnum {
    WEAK("weak"),
    MODERATE("moderate"),
    STRONG("strong");

    private final String value;

    TrendStrength(String value) {
        this.value = value;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static TrendStrength fromValue(String value) {
        return ApiEnums.parse(TrendStrength.class, value);
    }
}
