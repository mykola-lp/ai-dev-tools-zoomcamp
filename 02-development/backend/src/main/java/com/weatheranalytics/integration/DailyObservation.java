package com.weatheranalytics.integration;

import com.weatheranalytics.domain.WeatherValues;
import java.time.LocalDate;

public record DailyObservation(LocalDate date, WeatherValues values) {
}
