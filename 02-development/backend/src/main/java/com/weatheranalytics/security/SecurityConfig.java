package com.weatheranalytics.security;

import com.weatheranalytics.config.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Anonymous users may use cities, weather, analytics and public views. Everything that touches persistent,
     * user-owned data requires a valid token. Ownership/visibility rules (403/404) are enforced in the services,
     * because they depend on the loaded resource.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, TokenService tokenService,
                                                   AppProperties properties, ApiErrorWriter errorWriter)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // stateless: credentials are never sent implicitly by default
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint(errorWriter).accessDeniedHandler(errorWriter))
                .authorizeHttpRequests(auth -> auth
                        // a single view is readable anonymously when public (the service decides)
                        .requestMatchers(antMatcher(HttpMethod.GET, "/api/views/*")).permitAll()
                        .requestMatchers(
                                antMatcher("/api/saved-cities/**"),
                                antMatcher("/api/saved-cities"),
                                antMatcher("/api/views/**"),
                                antMatcher("/api/views"),
                                antMatcher("/api/personal-dashboard"),
                                antMatcher("/api/history/**")).authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(new TokenAuthenticationFilter(tokenService, properties.auth().cookieName()),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
