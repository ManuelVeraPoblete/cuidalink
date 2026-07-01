package com.cuidalink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CuidaLinkApplication {
    public static void main(String[] args) {
        SpringApplication.run(CuidaLinkApplication.class, args);
    }
}
