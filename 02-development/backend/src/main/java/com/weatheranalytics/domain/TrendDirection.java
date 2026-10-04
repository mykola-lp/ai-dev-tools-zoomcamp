package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TrendDirection implements ApiEnum {
    UP("up"),
    DOWN("down"),
    FLAT("flat");

    private final String value;

    TrendDirection(String value) {
        this.value = value;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static TrendDirection fromValue(String value) {
        return ApiEnums.parse(TrendDirection.class, value);
    }
}
