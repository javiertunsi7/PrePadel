package com.prepadel.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El tope de registros y las cabeceras de seguridad, tal y como quedan montados en la app. */
@SpringBootTest(properties = "prepadel.rate-limit.registrations-per-hour=2")
@ActiveProfiles("test")
class ApiProtectionTest {

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private SecurityHeadersFilter securityHeaders;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(securityHeaders).build();
	}

	@Test
	void theThirdRegistrationFromTheSameConnectionIsRejectedAndTheRestOfTheApiKeepsWorking() throws Exception {
		mvc.perform(registration("198.51.100.4")).andExpect(status().isCreated());
		mvc.perform(registration("198.51.100.4")).andExpect(status().isCreated());

		mvc.perform(registration("198.51.100.4"))
			.andExpect(status().isTooManyRequests())
			.andExpect(header().exists(HttpHeaders.RETRY_AFTER))
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.detail").exists());

		mvc.perform(registration("198.51.100.5")).andExpect(status().isCreated());
		mvc.perform(get("/api/content").with(request -> {
			request.setRemoteAddr("198.51.100.4");
			return request;
		})).andExpect(status().isOk());
	}

	@Test
	void everyAnswerCarriesTheSecurityHeaders() throws Exception {
		for (String path : new String[] { "/", "/api/content", "/api/no-existe" }) {
			mvc.perform(get(path))
				.andExpect(header().string("Content-Security-Policy", SecurityHeadersFilter.CONTENT_SECURITY_POLICY))
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().string("X-Frame-Options", "DENY"))
				.andExpect(header().string("Referrer-Policy", "no-referrer"))
				.andExpect(header().doesNotExist("Strict-Transport-Security"));
		}
	}

	@Test
	void httpsAnswersTellTheBrowserToStayOnHttps() throws Exception {
		mvc.perform(get("/api/content").secure(true))
			.andExpect(header().string("Strict-Transport-Security", "max-age=31536000"));
	}

	private static MockHttpServletRequestBuilder registration(String ip) {
		return post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"ELBOW": 3, "SHOULDER": 0, "KNEE": 0},
				 "healthDataConsent": true}
				""").with(request -> {
			request.setRemoteAddr(ip);
			return request;
		});
	}

}
