package com.weatheranalytics.integration;

import com.weatheranalytics.domain.DataCategory;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * The application's view of an upstream weather source. Nothing outside the integration package knows
 * which provider (Open-Meteo today) sits behind this interface or what its wire format looks like.
 */
public interface WeatherProvider {

    /** Current conditions, keyed by city id. */
    Map<String, CurrentObservation> fetchCurrent(Collection<CityLocation> cities);

    /**
     * Daily values keyed by city id (UTC days).
     * HISTORICAL: the last 90 days up to and including today. FORECAST: today and the next 14 days.
     * CURRENT is not a daily category and is rejected with {@link IllegalArgumentException}.
     */
    Map<String, List<DailyObservation>> fetchDaily(Collection<CityLocation> cities, DataCategory category);
}
