package com.weatheranalytics.domain;

import java.time.LocalDate;

public record DailyPoint(LocalDate date, WeatherValues values) {
}
