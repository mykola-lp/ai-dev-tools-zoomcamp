package com.weatheranalytics.service;

import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.api.error.ApiException;
import com.weatheranalytics.api.mapper.CityMapper;
import com.weatheranalytics.entity.CityEntity;
import com.weatheranalytics.entity.SavedCityEntity;
import com.weatheranalytics.repository.CityRepository;
import com.weatheranalytics.repository.SavedCityRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedCityService {

    private final SavedCityRepository savedCities;
    private final CityRepository cities;

    public SavedCityService(SavedCityRepository savedCities, CityRepository cities) {
        this.savedCities = savedCities;
        this.cities = cities;
    }

    @Transactional(readOnly = true)
    public List<City> list(String userId) {
        List<SavedCityEntity> saved = savedCities.findByUserIdOrderByPositionAsc(userId);
        Map<String, CityEntity> byId = cities.findAllById(saved.stream().map(SavedCityEntity::getCityId).toList())
                .stream().collect(Collectors.toMap(CityEntity::getId, Function.identity()));
        return saved.stream().map(s -> byId.get(s.getCityId())).map(CityMapper::toDto).toList();
    }

    /** Idempotent: saving an already-saved city changes nothing. */
    @Transactional
    public List<City> add(String userId, String cityId) {
        if (!cities.existsById(cityId)) {
            throw ApiException.notFound("Unknown city id: " + cityId);
        }
        if (!savedCities.existsByUserIdAndCityId(userId, cityId)) {
            int next = savedCities.maxPosition(userId) + 1;
            savedCities.save(new SavedCityEntity(UUID.randomUUID().toString(), userId, cityId, next));
        }
        return list(userId);
    }

    /** Idempotent: removing a city that is not saved changes nothing. */
    @Transactional
    public List<City> remove(String userId, String cityId) {
        savedCities.deleteByUserAndCity(userId, cityId);
        return list(userId);
    }
}
