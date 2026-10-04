package com.weatheranalytics.api.dto;

/**
 * Response of register/login: the contract's `User` plus the bearer `token`
 * (additive extension; the same token is also set in the SESSION cookie).
 */
public record AuthResponse(String id, String email, String token) {
}
