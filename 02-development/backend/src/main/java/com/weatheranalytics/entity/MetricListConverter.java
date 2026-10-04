package com.weatheranalytics.entity;

import com.weatheranalytics.domain.Metric;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter
public class MetricListConverter implements AttributeConverter<List<Metric>, String> {

    @Override
    public String convertToDatabaseColumn(List<Metric> attribute) {
        return attribute == null ? null : attribute.stream().map(Metric::name).collect(Collectors.joining(","));
    }

    @Override
    public List<Metric> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        return Arrays.stream(dbData.split(",")).map(Metric::valueOf).toList();
    }
}
