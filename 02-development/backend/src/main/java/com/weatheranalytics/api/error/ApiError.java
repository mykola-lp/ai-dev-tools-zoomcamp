package com.weatheranalytics.api.error;

public record ApiError(ErrorCode code, String message) {
}
