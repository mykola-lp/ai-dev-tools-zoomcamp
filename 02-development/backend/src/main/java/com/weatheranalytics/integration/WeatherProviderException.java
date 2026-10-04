package com.weatheranalytics.integration;

/** Raised when the upstream weather provider is unreachable, rejects the request or returns unusable data. */
public class WeatherProviderException extends RuntimeException {

    public WeatherProviderException(String message) {
        super(message);
    }

    public WeatherProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
