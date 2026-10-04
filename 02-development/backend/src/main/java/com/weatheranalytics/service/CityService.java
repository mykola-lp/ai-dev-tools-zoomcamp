package com.weatheranalytics.service;

import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.api.error.ApiException;
import com.weatheranalytics.api.mapper.CityMapper;
import com.weatheranalytics.entity.CityEntity;
import com.weatheranalytics.repository.CityRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CityService {

    static final int SEARCH_LIMIT = 8;

    private final CityRepository cities;

    public CityService(CityRepository cities) {
        this.cities = cities;
    }

    private record Scored(CityEntity city, int score) {
    }

    /**
     * Case-insensitive search over name and country, best matches first (exact name, name prefix, name substring,
     * country prefix, country substring), at most {@value #SEARCH_LIMIT} results. The reference list is small,
     * so ranking is done in memory.
     */
    public List<City> search(String query) {
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (needle.isEmpty()) {
            return List.of();
        }
        return cities.findAll().stream()
                .map(c -> new Scored(c, score(c, needle)))
                .filter(s -> s.score() > 0)
                .sorted(Comparator.<Scored>comparingInt(Scored::score).reversed()
                        .thenComparing(s -> s.city().getName()))
                .limit(SEARCH_LIMIT)
                .map(s -> CityMapper.toDto(s.city()))
                .toList();
    }

    public List<City> mapCities() {
        return cities.findByOnMapTrueOrderByNameAsc().stream().map(CityMapper::toDto).toList();
    }

    /** Cities in the requested order; NOT_FOUND if any id is unknown. */
    public List<CityEntity> requireEntities(List<String> ids) {
        Map<String, CityEntity> found = load(ids);
        List<String> missing = missing(ids, found);
        if (!missing.isEmpty()) {
            throw ApiException.notFound("Unknown city ids: " + String.join(", ", missing));
        }
        return ids.stream().map(found::get).toList();
    }

    public List<City> requireAll(List<String> ids) {
        return requireEntities(ids).stream().map(CityMapper::toDto).toList();
    }

    /** Used when ids are part of a request body: unknown ids are a VALIDATION error rather than NOT_FOUND. */
    public void ensureExist(List<String> ids) {
        List<String> missing = missing(ids, load(ids));
        if (!missing.isEmpty()) {
            throw ApiException.validation("Unknown city ids: " + String.join(", ", missing));
        }
    }

    /** The given ids that exist, in the given order. */
    public List<String> filterExisting(List<String> ids) {
        Map<String, CityEntity> found = load(ids);
        return ids.stream().filter(found::containsKey).toList();
    }

    private Map<String, CityEntity> load(List<String> ids) {
        return cities.findAllById(ids).stream().collect(Collectors.toMap(CityEntity::getId, Function.identity()));
    }

    private static List<String> missing(List<String> ids, Map<String, CityEntity> found) {
        return ids.stream().filter(id -> !found.containsKey(id)).distinct().toList();
    }

    private static int score(CityEntity city, String needle) {
        String name = city.getName().toLowerCase(Locale.ROOT);
        String country = city.getCountry().toLowerCase(Locale.ROOT);
        if (name.equals(needle)) {
            return 100;
        }
        if (name.startsWith(needle)) {
            return 80;
        }
        if (name.contains(needle)) {
            return 60;
        }
        if (country.startsWith(needle)) {
            return 40;
        }
        if (country.contains(needle)) {
            return 20;
        }
        return 0;
    }
}
