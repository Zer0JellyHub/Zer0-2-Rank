package dev.zer0rank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
import dev.zer0rank.config.RankConfig;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(RankConfig.class)
public class Zer0RankApplication {
    public static void main(String[] args) {
        SpringApplication.run(Zer0RankApplication.class, args);
    }
}
