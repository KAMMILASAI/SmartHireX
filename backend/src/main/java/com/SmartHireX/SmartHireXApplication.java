package com.SmartHireX;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartHireXApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartHireXApplication.class, args);
	}

}
