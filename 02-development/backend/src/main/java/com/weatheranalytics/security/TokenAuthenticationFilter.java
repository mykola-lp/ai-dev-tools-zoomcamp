package com.weatheranalytics.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates a request when it carries a valid token. An absent or invalid token simply leaves the request
 * anonymous; the authorization rules in {@link SecurityConfig} decide whether that is acceptable for the endpoint
 * (so e.g. public views stay readable even if a stale token is sent).
 */
public class TokenAuthenticationFilter extends OncePerRequestFilter {

    private final TokenService tokenService;
    private final String cookieName;

    public TokenAuthenticationFilter(TokenService tokenService, String cookieName) {
        this.tokenService = tokenService;
        this.cookieName = cookieName;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        TokenExtractor.extract(request, cookieName)
                .flatMap(tokenService::authenticate)
                .ifPresent(user -> {
                    var authentication = new UsernamePasswordAuthenticationToken(
                            new AuthenticatedUser(user.getId(), user.getEmail()),
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_USER")));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
        chain.doFilter(request, response);
    }
}
