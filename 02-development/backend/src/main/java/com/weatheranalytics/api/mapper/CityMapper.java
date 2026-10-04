package com.weatheranalytics.api.mapper;

import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.entity.CityEntity;

public final class CityMapper {

    private CityMapper() {
    }

    public static City toDto(CityEntity e) {
        return new City(e.getId(), e.getName(), e.getCountry(), e.getLat(), e.getLon());
    }
}
