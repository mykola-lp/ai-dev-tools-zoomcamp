package com.weatheranalytics.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Severity implements ApiEnum {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high");

    private final String value;

    Severity(String value) {
        this.value = value;
    }

    @Override
    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static Severity fromValue(String value) {
        return ApiEnums.parse(Severity.class, value);
    }
}
