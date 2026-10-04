package com.weatheranalytics.integration.openmeteo;

import com.weatheranalytics.config.AppProperties;
import java.net.http.HttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class OpenMeteoConfig {

    @Bean
    public RestClient openMeteoRestClient(AppProperties properties) {
        AppProperties.Weather weather = properties.weather();
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(weather.timeout()).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(weather.timeout());
        return RestClient.builder()
                .baseUrl(weather.openMeteoBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
