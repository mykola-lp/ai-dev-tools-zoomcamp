package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DataCategory implements ApiEnum {
    CURRENT("current"),
    FORECAST("forecast"),
    HISTORICAL("historical");

    private final String value;

    DataCategory(String value) {
        this.value = value;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static DataCategory fromValue(String value) {
        return ApiEnums.parse(DataCategory.class, value);
    }
}
