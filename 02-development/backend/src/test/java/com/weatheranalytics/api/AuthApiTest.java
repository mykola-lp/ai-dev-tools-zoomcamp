package com.weatheranalytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.entity.AuthTokenEntity;
import com.weatheranalytics.entity.UserEntity;
import com.weatheranalytics.repository.AuthTokenRepository;
import com.weatheranalytics.repository.UserRepository;
import com.weatheranalytics.security.TokenService;
import com.weatheranalytics.support.ApiTestSupport;
import jakarta.servlet.http.Cookie;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthApiTest extends ApiTestSupport {

    @Autowired UserRepository users;
    @Autowired AuthTokenRepository tokens;
    @Autowired PasswordEncoder encoder;
    @Autowired AppClock clock;

    private String creds(String email, String password) throws Exception {
        return json.writeValueAsString(Map.of("email", email, "password", password));
    }

    @Test
    void registerStoresOnlyABcryptHashAndReturnsToken() throws Exception {
        String email = "hash-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(creds(email, "secret123")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.token").isNotEmpty());

        UserEntity stored = users.findByEmail(email).orElseThrow();
        assertThat(stored.getPasswordHash()).isNotEqualTo("secret123").startsWith("$2");
        assertThat(encoder.matches("secret123", stored.getPasswordHash())).isTrue();
    }

    @Test
    void tokensAreStoredOnlyAsHashes() throws Exception {
        Account me = register();
        assertThat(tokens.findById(me.token())).isEmpty();
        assertThat(tokens.findById(TokenService.hash(me.token()))).isPresent();
    }

    @Test
    void duplicateEmailIsConflictCaseInsensitively() throws Exception {
        Account me = register();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(creds(me.email().toUpperCase(), "another1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void invalidRegistrationIsValidationError() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(creds("a@b.com", "123")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(creds("not-an-email", "secret123")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));
    }

    @Test
    void loginWithWrongPasswordOrUnknownEmailIsUnauthorized() throws Exception {
        Account me = register();
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(creds(me.email(), "wrong-pass")))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(creds("nobody@example.com", "secret123")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginIssuesAWorkingToken() throws Exception {
        Account me = register();
        String token = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(creds(me.email(), "secret123"))).andExpect(status().isOk()).andReturn()).get("token").asText();
        mvc.perform(get("/api/auth/session").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(me.email()));
    }

    @Test
    void sessionIsNullForAnonymousAndNeverUnauthorized() throws Exception {
        mvc.perform(get("/api/auth/session")).andExpect(status().isOk()).andExpect(content().string("null"));
        mvc.perform(get("/api/auth/session").header("Authorization", "Bearer garbage"))
                .andExpect(status().isOk()).andExpect(content().string("null"));
    }

    @Test
    void sessionCookieIsAcceptedAsAlternativeToBearerHeader() throws Exception {
        Account me = register();
        mvc.perform(get("/api/auth/session").cookie(new Cookie("SESSION", me.token())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(me.id()));
    }

    @Test
    void logoutRevokesTheToken() throws Exception {
        Account me = register();
        mvc.perform(auth(post("/api/auth/logout"), me)).andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/saved-cities"), me)).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        Account me = register();
        String raw = "expired-" + UUID.randomUUID();
        var now = clock.now();
        tokens.save(new AuthTokenEntity(TokenService.hash(raw), me.id(), now.minus(2, ChronoUnit.DAYS), now.minus(1, ChronoUnit.DAYS)));
        mvc.perform(get("/api/saved-cities").header("Authorization", "Bearer " + raw)).andExpect(status().isUnauthorized());
        assertThat(tokens.findById(TokenService.hash(raw))).isEmpty();
    }

    @Test
    void protectedEndpointsRequireAuthenticationWithApiErrorBody() throws Exception {
        for (var path : new String[]{"/api/saved-cities", "/api/views", "/api/personal-dashboard", "/api/history/runs"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED")).andExpect(jsonPath("$.message").isNotEmpty());
        }
        mvc.perform(post("/api/history/runs").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
