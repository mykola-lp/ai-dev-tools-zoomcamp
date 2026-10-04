package com.weatheranalytics.repository;

import com.weatheranalytics.entity.DataFreshnessEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataFreshnessRepository extends JpaRepository<DataFreshnessEntity, String> {
}
