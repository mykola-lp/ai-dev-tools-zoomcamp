package com.weatheranalytics.config;

import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.PeriodRange;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** The contract declares the server URL as /api, so every controller is mounted under that prefix. */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/api", HandlerTypePredicate.forBasePackage("com.weatheranalytics.api.controller"));
    }

    /** Query/path parameters use the wire values (e.g. "last7", "current"), not the Java constant names. */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, PeriodRange.class, PeriodRange::fromValue);
        registry.addConverter(String.class, DataCategory.class, DataCategory::fromValue);
    }
}
