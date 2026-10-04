package com.weatheranalytics.domain;

public final class ApiEnums {

    private ApiEnums() {
    }

    public static <E extends Enum<E> & ApiEnum> E parse(Class<E> type, String raw) {
        if (raw != null) {
            String trimmed = raw.trim();
            for (E constant : type.getEnumConstants()) {
                if (constant.value().equals(trimmed)) {
                    return constant;
                }
            }
        }
        throw new IllegalArgumentException("Unknown " + type.getSimpleName() + " value: " + raw);
    }
}
