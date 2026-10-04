package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Visibility implements ApiEnum {
    PRIVATE("private"),
    PUBLIC("public");

    private final String value;

    Visibility(String value) {
        this.value = value;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static Visibility fromValue(String value) {
        return ApiEnums.parse(Visibility.class, value);
    }
}
