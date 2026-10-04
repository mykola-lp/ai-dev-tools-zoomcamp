package com.weatheranalytics.security;

import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.config.AppProperties;
import com.weatheranalytics.entity.AuthTokenEntity;
import com.weatheranalytics.entity.UserEntity;
import com.weatheranalytics.repository.AuthTokenRepository;
import com.weatheranalytics.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Issues and validates opaque bearer tokens. Tokens are 256 random bits; only their SHA-256 hash is stored,
 * so a leaked database does not leak usable tokens.
 */
@Service
public class TokenService {

    private static final int TOKEN_BYTES = 32;

    private final SecureRandom random = new SecureRandom();
    private final AuthTokenRepository tokens;
    private final UserRepository users;
    private final AppProperties properties;
    private final AppClock clock;

    public TokenService(AuthTokenRepository tokens, UserRepository users, AppProperties properties, AppClock clock) {
        this.tokens = tokens;
        this.users = users;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(String userId) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = clock.now();
        Instant expiresAt = now.plus(properties.auth().tokenTtl());
        tokens.save(new AuthTokenEntity(hash(raw), userId, now, expiresAt));
        return new IssuedToken(raw, expiresAt);
    }

    /** The user a token belongs to, or empty if the token is unknown or expired (expired tokens are purged). */
    public Optional<UserEntity> authenticate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        Optional<AuthTokenEntity> stored = tokens.findById(hash(rawToken));
        if (stored.isEmpty()) {
            return Optional.empty();
        }
        if (!stored.get().getExpiresAt().isAfter(clock.now())) {
            tokens.delete(stored.get());
            return Optional.empty();
        }
        return users.findById(stored.get().getUserId());
    }

    public void revoke(String rawToken) {
        if (rawToken != null && !rawToken.isBlank()) {
            tokens.findById(hash(rawToken)).ifPresent(tokens::delete);
        }
    }

    public static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
