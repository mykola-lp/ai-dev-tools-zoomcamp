package com.weatheranalytics.security;

/** Principal placed in the security context for a valid bearer token. */
public record AuthenticatedUser(String id, String email) {
}
