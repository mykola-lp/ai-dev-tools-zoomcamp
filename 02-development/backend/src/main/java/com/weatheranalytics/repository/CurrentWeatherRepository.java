package com.weatheranalytics.repository;

import com.weatheranalytics.entity.CurrentWeatherEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurrentWeatherRepository extends JpaRepository<CurrentWeatherEntity, String> {
}
