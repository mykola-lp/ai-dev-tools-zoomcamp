package com.weatheranalytics.repository;

import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.entity.DailyWeatherEntity;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DailyWeatherRepository extends JpaRepository<DailyWeatherEntity, String> {

    List<DailyWeatherEntity> findByCategoryAndCityIdIn(DataCategory category, Collection<String> cityIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from DailyWeatherEntity d where d.category = :category and d.cityId in :cityIds")
    int deleteByCategoryAndCityIds(@Param("category") DataCategory category,
                                   @Param("cityIds") Collection<String> cityIds);
}
