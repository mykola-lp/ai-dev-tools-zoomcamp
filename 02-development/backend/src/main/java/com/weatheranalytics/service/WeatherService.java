package com.weatheranalytics.service;

import com.weatheranalytics.api.dto.Freshness;
import com.weatheranalytics.api.dto.RefreshResult;
import com.weatheranalytics.api.error.ApiException;
import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.config.AppProperties;
import com.weatheranalytics.domain.CityCurrent;
import com.weatheranalytics.domain.CitySeriesData;
import com.weatheranalytics.domain.DailyPoint;
import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.entity.CityEntity;
import com.weatheranalytics.entity.CurrentWeatherEntity;
import com.weatheranalytics.entity.DailyWeatherEntity;
import com.weatheranalytics.integration.CityLocation;
import com.weatheranalytics.integration.DailyObservation;
import com.weatheranalytics.integration.WeatherProvider;
import com.weatheranalytics.integration.WeatherProviderException;
import com.weatheranalytics.repository.CityRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Serves weather from the local cache and talks to the upstream provider (through {@link WeatherProvider})
 * only to fill gaps or when a refresh is requested. Reads never refresh data that is already cached - freshness
 * is driven by the scheduled/manual refresh, so a stored analysis input does not change under a reader's feet.
 */
@Service
public class WeatherService {

    private static final Logger log = LoggerFactory.getLogger(WeatherService.class);

    private final CityService cityService;
    private final CityRepository cityRepository;
    private final WeatherCache cache;
    private final WeatherProvider provider;
    private final AppClock clock;
    private final AppProperties properties;
    private final Object refreshLock = new Object();

    public WeatherService(CityService cityService, CityRepository cityRepository, WeatherCache cache,
                          WeatherProvider provider, AppClock clock, AppProperties properties) {
        this.cityService = cityService;
        this.cityRepository = cityRepository;
        this.cache = cache;
        this.provider = provider;
        this.clock = clock;
        this.properties = properties;
    }

    // ---------------------------------------------------------------- current

    public List<CityCurrent> current(List<String> cityIds) {
        List<CityEntity> requested = cityService.requireEntities(cityIds);
        List<String> ids = requested.stream().map(CityEntity::getId).toList();

        Map<String, CurrentWeatherEntity> cached = cache.loadCurrent(ids);
        List<CityEntity> missing = requested.stream().filter(c -> !cached.containsKey(c.getId())).toList();
        Map<String, CurrentWeatherEntity> complete = cached;
        if (!missing.isEmpty()) {
            fetchCurrent(missing);
            complete = cache.loadCurrent(ids);
        }
        return toCurrent(requested, complete);
    }

    private static List<CityCurrent> toCurrent(List<CityEntity> requested, Map<String, CurrentWeatherEntity> data) {
        return requested.stream().map(city -> {
            CurrentWeatherEntity e = data.get(city.getId());
            if (e == null) {
                throw ApiException.upstream("No current weather available for " + city.getName(), null);
            }
            return new CityCurrent(city.getId(), e.getObservedAt(), e.getValues());
        }).toList();
    }

    private void fetchCurrent(Collection<CityEntity> cities) {
        var observations = upstream(() -> provider.fetchCurrent(locations(cities)));
        cache.saveCurrent(observations, clock.now());
    }

    // ----------------------------------------------------------------- series

    /** One series per requested city, each with exactly {@code period.days()} points. */
    public List<CitySeriesData> series(List<String> cityIds, PeriodRange period) {
        List<CityEntity> requested = cityService.requireEntities(cityIds);
        DataCategory category = period.category();
        LocalDate today = clock.today();
        LocalDate from = category == DataCategory.HISTORICAL ? today.minusDays(period.days()) : today.plusDays(1);
        LocalDate to = from.plusDays(period.days() - 1L);

        Map<String, List<DailyPoint>> window = loadWindow(category, requested, from, to);
        List<CityEntity> incomplete = incompleteCities(requested, window, period.days());
        if (!incomplete.isEmpty()) {
            fetchDaily(category, incomplete);
            window = loadWindow(category, requested, from, to);
        }
        return assemble(requested, window, period.days());
    }

    private static List<CityEntity> incompleteCities(List<CityEntity> cities, Map<String, List<DailyPoint>> window,
                                                     int days) {
        return cities.stream().filter(c -> window.get(c.getId()).size() < days).toList();
    }

    private static List<CitySeriesData> assemble(List<CityEntity> cities, Map<String, List<DailyPoint>> window,
                                                 int days) {
        return cities.stream().map(c -> {
            List<DailyPoint> points = window.get(c.getId());
            if (points.size() < days) {
                throw ApiException.upstream("Incomplete weather data for " + c.getName(), null);
            }
            return new CitySeriesData(c.getId(), points);
        }).toList();
    }

    private Map<String, List<DailyPoint>> loadWindow(DataCategory category, List<CityEntity> cities,
                                                     LocalDate from, LocalDate to) {
        List<String> ids = cities.stream().map(CityEntity::getId).toList();
        Map<String, List<DailyPoint>> byCity = cache.loadDaily(category, ids).stream()
                .filter(d -> !d.getDate().isBefore(from) && !d.getDate().isAfter(to))
                .sorted(Comparator.comparing(DailyWeatherEntity::getDate))
                .collect(Collectors.groupingBy(DailyWeatherEntity::getCityId,
                        Collectors.mapping(d -> new DailyPoint(d.getDate(), d.getValues()), Collectors.toList())));
        ids.forEach(id -> byCity.putIfAbsent(id, List.of()));
        return byCity;
    }

    private void fetchDaily(DataCategory category, Collection<CityEntity> cities) {
        Map<String, List<DailyObservation>> fetched = upstream(() -> provider.fetchDaily(locations(cities), category));
        LocalDate today = clock.today();
        // historical data ends yesterday, forecast data starts tomorrow (today belongs to "current")
        Map<String, List<DailyObservation>> filtered = fetched.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> e.getValue().stream()
                        .filter(d -> category == DataCategory.HISTORICAL ? d.date().isBefore(today) : d.date().isAfter(today))
                        .toList()));
        cache.replaceDaily(category, filtered, clock.now());
    }

    // ------------------------------------------------- freshness and refresh

    /** Always three entries: current, forecast, historical (epoch if never loaded). */
    public List<Freshness> freshness() {
        return Arrays.stream(DataCategory.values())
                .map(c -> new Freshness(c, cache.freshness(c).lastUpdated()))
                .toList();
    }

    /**
     * Refreshes a category for all known cities, unless it was refreshed less than the configured minimum age ago
     * (then the cached data is considered fresh enough and no upstream request is made).
     */
    public RefreshResult refresh(DataCategory category) {
        synchronized (refreshLock) {
            Instant lastUpdated = cache.freshness(category).lastUpdated();
            Instant now = clock.now();
            if (lastUpdated.plus(properties.weather().minAge().forCategory(category)).isAfter(now)) {
                return new RefreshResult(category, lastUpdated, false);
            }
            List<CityEntity> all = cityRepository.findAll();
            if (category == DataCategory.CURRENT) {
                fetchCurrent(all);
            } else {
                fetchDaily(category, all);
            }
            return new RefreshResult(category, cache.freshness(category).lastUpdated(), true);
        }
    }

    /** Identifies the data an analysis was computed from, e.g. {@code historical@v3:2026-06-15T12:00:00.000Z}. */
    public String dataVersion(DataCategory category) {
        WeatherCache.Freshness f = cache.freshness(category);
        return category.value() + "@v" + f.version() + ":" + com.weatheranalytics.util.Instants.toMillisString(f.lastUpdated());
    }

    // ---------------------------------------------------------------- helpers

    private static List<CityLocation> locations(Collection<CityEntity> cities) {
        return cities.stream().map(c -> new CityLocation(c.getId(), c.getLat(), c.getLon())).toList();
    }

    private <T> T upstream(Supplier<T> call) {
        try {
            return call.get();
        } catch (WeatherProviderException e) {
            log.warn("Weather provider failed: {}", e.getMessage());
            throw ApiException.upstream("Weather provider unavailable", e);
        }
    }
}
