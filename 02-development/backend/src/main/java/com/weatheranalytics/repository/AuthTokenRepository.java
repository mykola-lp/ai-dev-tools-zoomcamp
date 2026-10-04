package com.weatheranalytics.repository;

import com.weatheranalytics.entity.AuthTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthTokenRepository extends JpaRepository<AuthTokenEntity, String> {
}
