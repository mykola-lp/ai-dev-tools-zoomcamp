package com.weatheranalytics.repository;

import com.weatheranalytics.entity.ViewEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ViewRepository extends JpaRepository<ViewEntity, String> {

    List<ViewEntity> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);

    Optional<ViewEntity> findFirstByOwnerIdOrderByUpdatedAtDesc(String ownerId);
}
