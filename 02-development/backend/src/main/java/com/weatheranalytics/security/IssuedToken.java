package com.weatheranalytics.security;

import java.time.Instant;

public record IssuedToken(String token, Instant expiresAt) {
}
