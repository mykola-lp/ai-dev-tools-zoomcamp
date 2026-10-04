package com.weatheranalytics.api.mapper;

import com.weatheranalytics.api.dto.CitySeries;
import com.weatheranalytics.api.dto.CurrentWeather;
import com.weatheranalytics.api.dto.MetricValues;
import com.weatheranalytics.api.dto.SeriesPoint;
import com.weatheranalytics.domain.CityCurrent;
import com.weatheranalytics.domain.CitySeriesData;
import com.weatheranalytics.domain.WeatherValues;

public final class WeatherMapper {

    private WeatherMapper() {
    }

    public static MetricValues toDto(WeatherValues v) {
        return new MetricValues(v.temperature(), v.apparentTemperature(), v.precipitation(), v.windSpeed(),
                v.humidity(), v.pressure(), v.snowfall(), v.weatherCode());
    }

    public static CurrentWeather toDto(CityCurrent c) {
        return new CurrentWeather(c.cityId(), c.observedAt(), toDto(c.values()));
    }

    public static CitySeries toDto(CitySeriesData s) {
        return new CitySeries(s.cityId(),
                s.points().stream().map(p -> new SeriesPoint(p.date(), toDto(p.values()))).toList());
    }
}
