package com.weatheranalytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** A bearer token. The id is the SHA-256 hash of the token; the raw token is never stored. */
@Entity
@Table(name = "auth_tokens")
public class AuthTokenEntity extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    protected AuthTokenEntity() {
    }

    public AuthTokenEntity(String tokenHash, String userId, Instant createdAt, Instant expiresAt) {
        super(tokenHash);
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getUserId() {
        return userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
