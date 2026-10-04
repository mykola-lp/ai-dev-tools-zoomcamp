package com.weatheranalytics.service;

import com.weatheranalytics.api.error.ApiException;
import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.entity.UserEntity;
import com.weatheranalytics.repository.UserRepository;
import com.weatheranalytics.security.IssuedToken;
import com.weatheranalytics.security.TokenService;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    /** Compared against when the email is unknown so that login timing does not reveal registered emails. */
    private final String dummyHash;

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final AppClock clock;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokenService,
                       AppClock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public record Session(UserEntity user, IssuedToken token) {
    }

    public Session register(String email, String password) {
        UserEntity user = createUser(email, password);
        return new Session(user, tokenService.issue(user.getId()));
    }

    /** Creates a user with a BCrypt-hashed password; fails with CONFLICT if the email is already registered. */
    public UserEntity createUser(String email, String password) {
        String normalized = normalize(email);
        if (users.existsByEmail(normalized)) {
            throw ApiException.conflict("Email is already registered");
        }
        try {
            return users.saveAndFlush(new UserEntity(UUID.randomUUID().toString(), normalized,
                    passwordEncoder.encode(password), clock.now()));
        } catch (DataIntegrityViolationException e) {
            // lost a race with a concurrent registration of the same email
            throw ApiException.conflict("Email is already registered");
        }
    }

    public Session login(String email, String password) {
        UserEntity user = users.findByEmail(normalize(email)).orElse(null);
        boolean matches = passwordEncoder.matches(password, user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !matches) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        return new Session(user, tokenService.issue(user.getId()));
    }

    public void logout(String rawToken) {
        tokenService.revoke(rawToken);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
