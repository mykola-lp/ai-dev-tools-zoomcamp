package com.weatheranalytics.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class Instants {

    /** Fixed-width format so that string ordering in SQLite equals chronological ordering. */
    private static final DateTimeFormatter STORAGE = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'");
    private static final DateTimeFormatter MILLIS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    private Instants() {
    }

    public static String toStorage(Instant instant) {
        return STORAGE.format(LocalDateTime.ofInstant(instant, ZoneOffset.UTC));
    }

    public static Instant fromStorage(String value) {
        return LocalDateTime.parse(value, STORAGE).toInstant(ZoneOffset.UTC);
    }

    /** Millisecond-precision ISO form used in data version strings, e.g. 2026-06-15T12:00:00.000Z. */
    public static String toMillisString(Instant instant) {
        return MILLIS.format(LocalDateTime.ofInstant(instant, ZoneOffset.UTC));
    }
}
