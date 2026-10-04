package com.weatheranalytics.repository;

import com.weatheranalytics.entity.CityEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<CityEntity, String> {

    List<CityEntity> findByOnMapTrueOrderByNameAsc();
}
