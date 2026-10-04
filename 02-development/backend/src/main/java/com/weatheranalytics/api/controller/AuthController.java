package com.weatheranalytics.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.weatheranalytics.api.dto.AuthResponse;
import com.weatheranalytics.api.dto.Credentials;
import com.weatheranalytics.api.dto.User;
import com.weatheranalytics.config.AppProperties;
import com.weatheranalytics.security.AuthenticatedUser;
import com.weatheranalytics.security.TokenExtractor;
import com.weatheranalytics.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;

    public AuthController(AuthService authService, AppProperties properties, ObjectMapper objectMapper) {
        this.authService = authService;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /** The signed-in user, or JSON `null` when anonymous. Never 401. */
    @GetMapping(value = "/session", produces = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode session(@AuthenticationPrincipal AuthenticatedUser user) {
        return user == null ? NullNode.getInstance()
                : objectMapper.valueToTree(new User(user.id(), user.email()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody Credentials credentials) {
        return sessionResponse(HttpStatus.CREATED, authService.register(credentials.email(), credentials.password()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody Credentials credentials) {
        return sessionResponse(HttpStatus.OK, authService.login(credentials.email(), credentials.password()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        TokenExtractor.extract(request, properties.auth().cookieName()).ifPresent(authService::logout);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .build();
    }

    private ResponseEntity<AuthResponse> sessionResponse(HttpStatus status, AuthService.Session session) {
        Duration maxAge = Duration.between(Instant.now(), session.token().expiresAt());
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookie(session.token().token(), maxAge).toString())
                .body(new AuthResponse(session.user().getId(), session.user().getEmail(), session.token().token()));
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(properties.auth().cookieName(), value)
                .httpOnly(true)
                .secure(properties.auth().cookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
