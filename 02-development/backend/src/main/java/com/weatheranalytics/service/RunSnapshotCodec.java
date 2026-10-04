package com.weatheranalytics.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weatheranalytics.api.dto.City;
import java.util.List;
import org.springframework.stereotype.Component;

/** Serialises the parts of an analysis snapshot that are stored as JSON documents inside the run row. */
@Component
public class RunSnapshotCodec {

    private final ObjectMapper objectMapper;

    public RunSnapshotCodec(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialise analysis snapshot", e);
        }
    }

    public <T> T read(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot read stored analysis snapshot", e);
        }
    }

    public List<City> readCities(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<City>>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot read stored analysis snapshot", e);
        }
    }
}
