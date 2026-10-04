package com.weatheranalytics.support;

import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.WeatherValues;
import com.weatheranalytics.integration.CityLocation;
import com.weatheranalytics.integration.CurrentObservation;
import com.weatheranalytics.integration.DailyObservation;
import com.weatheranalytics.integration.WeatherProvider;
import com.weatheranalytics.integration.WeatherProviderException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/** Deterministic in-memory provider: no network, switchable failure, adjustable temperature offset. */
public class StubWeatherProvider implements WeatherProvider {

    public final AtomicInteger currentCalls = new AtomicInteger();
    public final AtomicInteger dailyCalls = new AtomicInteger();
    public volatile boolean failing;
    public volatile double offset;

    public void reset() {
        currentCalls.set(0);
        dailyCalls.set(0);
        failing = false;
        offset = 0;
    }

    @Override
    public Map<String, CurrentObservation> fetchCurrent(Collection<CityLocation> cities) {
        currentCalls.incrementAndGet();
        failIfRequested();
        Map<String, CurrentObservation> out = new LinkedHashMap<>();
        cities.forEach(c -> out.put(c.id(), new CurrentObservation(Instant.now(), values(12 + offset, 0))));
        return out;
    }

    @Override
    public Map<String, List<DailyObservation>> fetchDaily(Collection<CityLocation> cities, DataCategory category) {
        dailyCalls.incrementAndGet();
        failIfRequested();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = category == DataCategory.HISTORICAL ? today.minusDays(PeriodRange.MAX_HISTORICAL_DAYS) : today;
        LocalDate to = category == DataCategory.HISTORICAL ? today : today.plusDays(PeriodRange.MAX_FORECAST_DAYS);
        Map<String, List<DailyObservation>> out = new LinkedHashMap<>();
        for (CityLocation city : cities) {
            List<DailyObservation> days = new ArrayList<>();
            int i = 0;
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1), i++) {
                days.add(new DailyObservation(d, values(10 + offset + (i % 5), i % 3 == 0 ? 2.5 : 0)));
            }
            out.put(city.id(), days);
        }
        return out;
    }

    public static WeatherValues values(double temperature, double precipitation) {
        return new WeatherValues(temperature, temperature - 1, precipitation, 12, 65, 1013, 0, 1);
    }

    private void failIfRequested() {
        if (failing) {
            throw new WeatherProviderException("stub failure");
        }
    }
}
