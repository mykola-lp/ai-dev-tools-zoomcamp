package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ChartType implements ApiEnum {
    LINE("line"),
    BAR("bar");

    private final String value;

    ChartType(String value) {
        this.value = value;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static ChartType fromValue(String value) {
        return ApiEnums.parse(ChartType.class, value);
    }
}
