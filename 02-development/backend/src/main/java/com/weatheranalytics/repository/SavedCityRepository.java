package com.weatheranalytics.repository;

import com.weatheranalytics.entity.SavedCityEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavedCityRepository extends JpaRepository<SavedCityEntity, String> {

    List<SavedCityEntity> findByUserIdOrderByPositionAsc(String userId);

    boolean existsByUserIdAndCityId(String userId, String cityId);

    @Query("select coalesce(max(s.position), 0) from SavedCityEntity s where s.userId = :userId")
    int maxPosition(@Param("userId") String userId);

    @Modifying
    @Query("delete from SavedCityEntity s where s.userId = :userId and s.cityId = :cityId")
    int deleteByUserAndCity(@Param("userId") String userId, @Param("cityId") String cityId);
}
