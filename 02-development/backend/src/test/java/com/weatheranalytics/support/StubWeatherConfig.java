package com.weatheranalytics.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class StubWeatherConfig {

    @Bean
    @Primary
    public StubWeatherProvider stubWeatherProvider() {
        return new StubWeatherProvider();
    }
}
