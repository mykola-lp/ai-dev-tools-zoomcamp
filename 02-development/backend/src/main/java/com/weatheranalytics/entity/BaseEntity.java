package com.weatheranalytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Transient;
import org.springframework.data.domain.Persistable;

/**
 * Base for entities with application-assigned String ids. Implementing {@link Persistable} lets Spring Data
 * issue a plain INSERT for new instances instead of a SELECT-then-merge.
 */
@MappedSuperclass
public abstract class BaseEntity implements Persistable<String> {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 128)
    private String id;

    @Transient
    private boolean newEntity = true;

    protected BaseEntity() {
    }

    protected BaseEntity(String id) {
        this.id = id;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return newEntity;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.newEntity = false;
    }
}
