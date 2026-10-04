package com.weatheranalytics.repository;

import com.weatheranalytics.entity.AnalysisRunEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/**
 * Deliberately a plain {@link Repository}: only insert and read operations are exposed, so no code path can
 * update or delete a stored analysis run.
 */
public interface AnalysisRunRepository extends Repository<AnalysisRunEntity, String> {

    <S extends AnalysisRunEntity> S save(S entity);

    Optional<AnalysisRunEntity> findByIdAndUserId(String id, String userId);

    List<AnalysisRunEntity> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserId(String userId);
}
