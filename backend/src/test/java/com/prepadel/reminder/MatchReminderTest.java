package com.prepadel.reminder;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El aviso del partido con la app cerrada, con un servicio de notificaciones de mentira. */
@SpringBootTest
@ActiveProfiles("test")
class MatchReminderTest {

	private static final String ENDPOINT = "https://fcm.googleapis.com/fcm/send/";

	@TestConfiguration
	static class FakePush {

		@Bean
		@Primary
		RecordingGateway recordingGateway() {
			return new RecordingGateway();
		}

	}

	static class RecordingGateway implements PushGateway {

		final List<String> sent = new ArrayList<>();
		Result answer = Result.DELIVERED;

		@Override
		public boolean enabled() {
			return true;
		}

		@Override
		public String publicKey() {
			return "clave-publica-de-prueba";
		}

		@Override
		public Result send(MatchReminder reminder, String payloadJson) {
			sent.add(reminder.getEndpoint() + " " + payloadJson);
			return answer;
		}

	}

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private ReminderService service;

	@Autowired
	private MatchReminderRepository repository;

	@Autowired
	private RecordingGateway gateway;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		repository.deleteAll();
		gateway.sent.clear();
		gateway.answer = PushGateway.Result.DELIVERED;
	}

	@Test
	void theAppLearnsThePublicKeyFromTheCatalog() throws Exception {
		mvc.perform(get("/api/content")).andExpect(jsonPath("$.pushPublicKey").value("clave-publica-de-prueba"));
	}

	@Test
	void sendsTheReminderOnceWhenTheMatchIsHalfAnHourAway() throws Exception {
		String soon = register();
		String later = register();
		remind(soon, Instant.now().plus(Duration.ofMinutes(20)), ENDPOINT + "pronto").andExpect(status().isOk());
		remind(later, Instant.now().plus(Duration.ofHours(2)), ENDPOINT + "luego").andExpect(status().isOk());

		assertThat(service.sendDue()).isEqualTo(1);
		assertThat(service.sendDue()).isZero();

		assertThat(gateway.sent).singleElement().satisfies(message -> assertThat(message)
			.startsWith(ENDPOINT + "pronto ")
			.contains("Toca calentar")
			.contains("20 minutos"));
	}

	@Test
	void changingTheTimeSchedulesTheReminderAgainAndCancellingRemovesIt() throws Exception {
		String token = register();
		remind(token, Instant.now().plus(Duration.ofMinutes(10)), ENDPOINT + "a").andExpect(status().isOk());
		assertThat(service.sendDue()).isEqualTo(1);

		remind(token, Instant.now().plus(Duration.ofMinutes(25)), ENDPOINT + "a").andExpect(status().isOk());
		assertThat(repository.count()).isEqualTo(1);
		assertThat(service.sendDue()).isEqualTo(1);

		mvc.perform(post("/api/me/reminder").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"matchAt\": null}")).andExpect(status().isOk());
		assertThat(repository.count()).isZero();
	}

	@Test
	void aSubscriptionThatNoLongerExistsIsForgotten() throws Exception {
		remind(register(), Instant.now().plus(Duration.ofMinutes(15)), ENDPOINT + "b").andExpect(status().isOk());
		gateway.answer = PushGateway.Result.GONE;

		assertThat(service.sendDue()).isZero();
		assertThat(repository.count()).isZero();
	}

	@Test
	void pastMatchesAreCleanedUpAndDeletingThePlayerDeletesTheReminder() throws Exception {
		String token = register();
		remind(token, Instant.now().minus(Duration.ofHours(30)), ENDPOINT + "viejo").andExpect(status().isOk());
		service.sendDue();
		assertThat(repository.count()).isZero();

		remind(token, Instant.now().plus(Duration.ofHours(3)), ENDPOINT + "c").andExpect(status().isOk());
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/me")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isNoContent());
		assertThat(repository.count()).isZero();
	}

	@Test
	void onlyKnownPushServicesAreAccepted() throws Exception {
		String token = register();
		Instant match = Instant.now().plus(Duration.ofMinutes(20));
		for (String endpoint : List.of("https://evil.example/hook", "http://fcm.googleapis.com/fcm/send/x",
				"https://fcm.googleapis.com.evil.example/x", "https://localhost:8080/api/admin/stats",
				"https://user@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x")) {
			remind(token, match, endpoint).andExpect(status().isBadRequest());
		}
		remind(token, Instant.now().plus(Duration.ofDays(30)), ENDPOINT + "lejos").andExpect(status().isBadRequest());
		assertThat(repository.count()).isZero();

		assertThat(WebPushGateway.isPushService("https://updates.push.services.mozilla.com/wpush/v2/abc")).isTrue();
		assertThat(WebPushGateway.isPushService("https://web.push.apple.com/abc")).isTrue();
		assertThat(WebPushGateway.isPushService("https://wns2-par02p.notify.windows.com/w/?token=abc")).isTrue();
	}

	private ResultActions remind(String token, Instant matchAt, String endpoint) throws Exception {
		return mvc.perform(post("/api/me/reminder").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"matchAt": "%s", "subscription": {"endpoint": "%s",
					 "p256dh": "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
					 "auth": "BTBZMqHH6r4Tts7J_aSIgg"}}
					""".formatted(matchAt, endpoint)));
	}

	private String register() throws Exception {
		String body = mvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"ELBOW": 3, "SHOULDER": 0, "KNEE": 0},
				 "healthDataConsent": true}
				""")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
		return JsonPath.read(body, "$.token");
	}

}
