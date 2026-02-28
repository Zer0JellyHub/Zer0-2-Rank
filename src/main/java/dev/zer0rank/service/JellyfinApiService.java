package dev.zer0rank.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.zer0rank.config.RankConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Minimal Jellyfin REST API client.
 * Uses java.net.http.HttpClient (built-in since Java 11).
 */
@Service
public class JellyfinApiService {

    private static final Logger log    = LoggerFactory.getLogger(JellyfinApiService.class);
    private static final int    TIMEOUT = 10;

    private final RankConfig   config;
    private final HttpClient   http;
    private final ObjectMapper mapper = new ObjectMapper();

    public JellyfinApiService(RankConfig config) {
        this.config = config;
        this.http   = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(TIMEOUT))
                .build();
    }

    /**
     * Returns a map of userId -> username for all users on the Jellyfin server.
     * Returns an empty map on any error.
     */
    public Map<String, String> fetchAllUsers() {
        Map<String, String> result = new HashMap<>();
        String url = config.getJellyfinUrl() + "/Users?api_key=" + config.getJellyfinApiKey();

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(TIMEOUT))
                    .GET().build();

            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());

            if (res.statusCode() == 200) {
                JsonNode arr = mapper.readTree(res.body());
                for (JsonNode user : arr) {
                    String id   = user.path("Id").asText("");
                    String name = user.path("Name").asText("Unknown");
                    if (!id.isBlank()) result.put(id, name);
                }
            } else {
                log.warn("Jellyfin /Users returned HTTP {}", res.statusCode());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Jellyfin users: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Returns the display name of a single Jellyfin user, or "Unknown" on failure.
     */
    public String fetchUsername(String userId) {
        String url = config.getJellyfinUrl() + "/Users/" + userId
                   + "?api_key=" + config.getJellyfinApiKey();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(TIMEOUT))
                    .GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200) {
                return mapper.readTree(res.body()).path("Name").asText("Unknown");
            }
        } catch (Exception e) {
            log.warn("fetchUsername({}) failed: {}", userId, e.getMessage());
        }
        return "Unknown";
    }
}
