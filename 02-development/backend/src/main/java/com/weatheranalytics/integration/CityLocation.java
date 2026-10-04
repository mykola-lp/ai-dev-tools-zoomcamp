package com.weatheranalytics.integration;

/** What the weather provider needs to know about a city. */
public record CityLocation(String id, double lat, double lon) {
}
