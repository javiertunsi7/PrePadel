package com.prepadel.reminder;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
import static org.assertj.core.api.Assertions.tuple;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El aviso de cada partido con la app cerrada, con un servicio de notificaciones de mentira. */
@SpringBootTest
@ActiveProfiles("test")
class MatchReminderTest {

	private static final String ENDPOINT = "https://fcm.googleapis.com/fcm/send/";

	private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");

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
		saveMatch(soon, UUID.randomUUID(), Instant.now().plus(Duration.ofMinutes(20)), ENDPOINT + "pronto", false)
			.andExpect(status().isOk());
		saveMatch(later, UUID.randomUUID(), Instant.now().plus(Duration.ofHours(2)), ENDPOINT + "luego", false)
			.andExpect(status().isOk());

		assertThat(service.sendDue()).isEqualTo(1);
		assertThat(service.sendDue()).isZero();

		assertThat(gateway.sent).singleElement().satisfies(message -> assertThat(message)
			.startsWith(ENDPOINT + "pronto ")
			.contains("Toca calentar")
			.contains("20 minutos"));
	}

	@Test
	void twoWeeklyMatchesOnDifferentDaysEachGetTheirOwnReminder() throws Exception {
		String token = register();
		UUID soon = UUID.randomUUID();
		UUID inTwoDays = UUID.randomUUID();
		Instant inTwoDaysAt = in(Duration.ofDays(2).plusHours(1));
		saveMatch(token, soon, in(Duration.ofMinutes(20)), ENDPOINT + "movil", true).andExpect(status().isOk());
		saveMatch(token, inTwoDays, inTwoDaysAt, ENDPOINT + "movil", true).andExpect(status().isOk());
		assertThat(repository.count()).isEqualTo(2);

		// Solo toca avisar del que empieza en 20 minutos; el otro espera a su día.
		assertThat(service.sendDue()).isEqualTo(1);
		assertThat(service.sendDue()).isZero();
		assertThat(gateway.sent).singleElement().asString().contains("20 minutos");
		assertThat(match(soon).getSentAt()).isNotNull();
		assertThat(match(inTwoDays).getSentAt()).isNull();
		assertThat(match(inTwoDays).getMatchAt()).isEqualTo(inTwoDaysAt);
	}

	@Test
	void twoWeeklyMatchesOnDifferentDaysMoveToTheirOwnDayOfNextWeek() throws Exception {
		String token = register();
		UUID tuesday = UUID.randomUUID();
		UUID thursday = UUID.randomUUID();
		// Martes a las 19:00 y jueves a las 20:00 de la semana pasada: los dos ya se jugaron.
		ZonedDateTime lastTuesday = ZonedDateTime.now(MADRID)
			.with(DayOfWeek.TUESDAY)
			.truncatedTo(ChronoUnit.DAYS)
			.withHour(19)
			.minusWeeks(1);
		ZonedDateTime lastThursday = lastTuesday.plusDays(2).withHour(20);
		saveMatch(token, tuesday, lastTuesday.toInstant(), ENDPOINT + "movil", true).andExpect(status().isOk());
		saveMatch(token, thursday, lastThursday.toInstant(), ENDPOINT + "movil", true).andExpect(status().isOk());

		service.sendDue();

		ZonedDateTime nextTuesday = match(tuesday).getMatchAt().atZone(MADRID);
		ZonedDateTime nextThursday = match(thursday).getMatchAt().atZone(MADRID);
		assertThat(nextTuesday.getDayOfWeek()).isEqualTo(DayOfWeek.TUESDAY);
		assertThat(nextTuesday.toLocalTime()).hasToString("19:00");
		assertThat(nextThursday.getDayOfWeek()).isEqualTo(DayOfWeek.THURSDAY);
		assertThat(nextThursday.toLocalTime()).hasToString("20:00");
		for (ZonedDateTime next : List.of(nextTuesday, nextThursday)) {
			assertThat(next.toInstant()).isAfter(Instant.now()).isBefore(Instant.now().plus(Duration.ofDays(7)));
		}
		assertThat(repository.findAll()).allSatisfy(reminder -> assertThat(reminder.getSentAt()).isNull());
	}

	@Test
	void changingTheTimeSchedulesTheReminderAgainAndRemovingOneMatchKeepsTheOthers() throws Exception {
		String token = register();
		UUID first = UUID.randomUUID();
		UUID second = UUID.randomUUID();
		saveMatch(token, first, Instant.now().plus(Duration.ofMinutes(10)), ENDPOINT + "a", false)
			.andExpect(status().isOk());
		saveMatch(token, second, Instant.now().plus(Duration.ofDays(1)), ENDPOINT + "a", false)
			.andExpect(status().isOk());
		assertThat(service.sendDue()).isEqualTo(1);

		// Mismo id: es el mismo partido con otra hora, no uno nuevo.
		saveMatch(token, first, Instant.now().plus(Duration.ofMinutes(25)), ENDPOINT + "a", false)
			.andExpect(status().isOk());
		assertThat(repository.count()).isEqualTo(2);
		assertThat(service.sendDue()).isEqualTo(1);

		removeMatch(token, first).andExpect(status().isOk()).andExpect(jsonPath("$.profile.age").value(47));
		removeMatch(token, first).andExpect(status().isOk());
		assertThat(repository.findAll()).singleElement()
			.satisfies(reminder -> assertThat(reminder.getId()).isEqualTo(second));
	}

	@Test
	void aPlayerHasAtMostFourMatches() throws Exception {
		String token = register();
		List<UUID> ids = new ArrayList<>();
		for (int day = 1; day <= ReminderService.MAX_MATCHES; day++) {
			UUID id = UUID.randomUUID();
			ids.add(id);
			saveMatch(token, id, Instant.now().plus(Duration.ofDays(day)), ENDPOINT + "m", true)
				.andExpect(status().isOk());
		}

		saveMatch(token, UUID.randomUUID(), Instant.now().plus(Duration.ofHours(5)), ENDPOINT + "m", false)
			.andExpect(status().isBadRequest());
		// Cambiar la hora de uno que ya tiene no cuenta como partido nuevo.
		saveMatch(token, ids.getFirst(), Instant.now().plus(Duration.ofHours(5)), ENDPOINT + "m", false)
			.andExpect(status().isOk());
		assertThat(repository.count()).isEqualTo(ReminderService.MAX_MATCHES);

		// El tope es de cada jugador.
		saveMatch(register(), UUID.randomUUID(), Instant.now().plus(Duration.ofHours(5)), ENDPOINT + "otro", false)
			.andExpect(status().isOk());
	}

	@Test
	void nobodyCanChangeOrRemoveAnotherPlayersMatch() throws Exception {
		String owner = register();
		String other = register();
		UUID id = UUID.randomUUID();
		Instant at = in(Duration.ofHours(3));
		Instant otherAt = in(Duration.ofHours(6));
		saveMatch(owner, id, at, ENDPOINT + "dueno", false).andExpect(status().isOk());

		// Con el mismo id, el otro jugador solo toca lo suyo.
		removeMatch(other, id).andExpect(status().isOk());
		saveMatch(other, id, otherAt, ENDPOINT + "otro", false).andExpect(status().isOk());

		assertThat(repository.findAll()).extracting(MatchReminder::getEndpoint, MatchReminder::getMatchAt)
			.containsExactlyInAnyOrder(tuple(ENDPOINT + "dueno", at), tuple(ENDPOINT + "otro", otherAt));
	}

	@Test
	void theOldSingleMatchRouteStillServesPhonesWithPendingQueues() throws Exception {
		String token = register();
		UUID newer = UUID.randomUUID();
		saveMatch(token, newer, Instant.now().plus(Duration.ofDays(2)), ENDPOINT + "nuevo", true)
			.andExpect(status().isOk());

		remindTheOldWay(token, Instant.now().plus(Duration.ofMinutes(20)), ENDPOINT + "viejo")
			.andExpect(status().isOk());
		remindTheOldWay(token, Instant.now().plus(Duration.ofMinutes(15)), ENDPOINT + "viejo")
			.andExpect(status().isOk());
		assertThat(repository.count()).isEqualTo(2);
		assertThat(match(ReminderService.LEGACY_MATCH).getEndpoint()).isEqualTo(ENDPOINT + "viejo");
		assertThat(service.sendDue()).isEqualTo(1);

		// Cancelar por la ruta antigua quita solo aquel partido.
		mvc.perform(post("/api/me/reminder").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"matchAt\": null}")).andExpect(status().isOk());
		assertThat(repository.findAll()).singleElement()
			.satisfies(reminder -> assertThat(reminder.getId()).isEqualTo(newer));

		// La app actualizada lo conoce por el id nulo y lo quita por la ruta nueva.
		remindTheOldWay(token, Instant.now().plus(Duration.ofMinutes(15)), ENDPOINT + "viejo")
			.andExpect(status().isOk());
		removeMatch(token, ReminderService.LEGACY_MATCH).andExpect(status().isOk());
		assertThat(repository.findAll()).singleElement()
			.satisfies(reminder -> assertThat(reminder.getId()).isEqualTo(newer));
	}

	@Test
	void aSubscriptionThatNoLongerExistsIsForgotten() throws Exception {
		saveMatch(register(), UUID.randomUUID(), Instant.now().plus(Duration.ofMinutes(15)), ENDPOINT + "b", false)
			.andExpect(status().isOk());
		gateway.answer = PushGateway.Result.GONE;

		assertThat(service.sendDue()).isZero();
		assertThat(repository.count()).isZero();
	}

	@Test
	void pastMatchesAreCleanedUpAndDeletingThePlayerDeletesTheirMatches() throws Exception {
		String token = register();
		saveMatch(token, UUID.randomUUID(), Instant.now().minus(Duration.ofHours(30)), ENDPOINT + "viejo", false)
			.andExpect(status().isOk());
		service.sendDue();
		assertThat(repository.count()).isZero();

		saveMatch(token, UUID.randomUUID(), Instant.now().plus(Duration.ofHours(3)), ENDPOINT + "c", false)
			.andExpect(status().isOk());
		saveMatch(token, UUID.randomUUID(), Instant.now().plus(Duration.ofDays(3)), ENDPOINT + "c", true)
			.andExpect(status().isOk());
		mvc.perform(delete("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isNoContent());
		assertThat(repository.count()).isZero();
	}

	@Test
	void aWeeklyMatchIsRemindedAgainTheNextWeekAtTheSameClockTime() throws Exception {
		String token = register();
		// Domingo 25 de octubre de 2026 a las 19:00 en Madrid: esa madrugada se cambia al horario de invierno.
		Instant before = ZonedDateTime.of(2026, 10, 18, 19, 0, 0, 0, MADRID).toInstant();
		UUID id = UUID.randomUUID();
		saveMatch(token, id, Instant.now().plus(Duration.ofMinutes(20)), ENDPOINT + "semanal", true)
			.andExpect(status().isOk());
		assertThat(service.sendDue()).isEqualTo(1);

		MatchReminder reminder = match(id);
		reminder.schedule(reminder.getEndpoint(), reminder.getP256dh(), reminder.getAuth(), before, true, MADRID);
		reminder.markSent(before.minus(Duration.ofMinutes(30)));
		reminder.rollToNextWeekAfter(before.plus(Duration.ofMinutes(1)));

		assertThat(reminder.getMatchAt().atZone(MADRID)).isEqualTo(ZonedDateTime.of(2026, 10, 25, 19, 0, 0, 0, MADRID));
		assertThat(reminder.getSentAt()).isNull();

		mvc.perform(post("/api/me/matches").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"id": "%s", "matchAt": "%s", "weekly": true, "timeZone": "Narnia/Capital",
					 "subscription": {"endpoint": "%sx", "p256dh": "a", "auth": "b"}}
					""".formatted(UUID.randomUUID(), Instant.now().plus(Duration.ofMinutes(10)), ENDPOINT)))
			.andExpect(status().isBadRequest());
	}

	@Test
	void aWeeklyMatchThatAlreadyStartedMovesToNextWeekInsteadOfBeingDeleted() throws Exception {
		String token = register();
		UUID id = UUID.randomUUID();
		saveMatch(token, id, Instant.now().minus(Duration.ofDays(2)), ENDPOINT + "semanal", true)
			.andExpect(status().isOk());

		service.sendDue();

		MatchReminder reminder = match(id);
		assertThat(reminder.isWeekly()).isTrue();
		assertThat(reminder.getMatchAt()).isBetween(Instant.now().plus(Duration.ofDays(4)),
				Instant.now().plus(Duration.ofDays(5)));
		assertThat(reminder.getSentAt()).isNull();
	}

	@Test
	void onlyKnownPushServicesAndCompleteMatchesAreAccepted() throws Exception {
		String token = register();
		Instant match = Instant.now().plus(Duration.ofMinutes(20));
		for (String endpoint : List.of("https://evil.example/hook", "http://fcm.googleapis.com/fcm/send/x",
				"https://fcm.googleapis.com.evil.example/x", "https://localhost:8080/api/admin/stats",
				"https://user@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x")) {
			saveMatch(token, UUID.randomUUID(), match, endpoint, false).andExpect(status().isBadRequest());
		}
		saveMatch(token, UUID.randomUUID(), Instant.now().plus(Duration.ofDays(30)), ENDPOINT + "lejos", false)
			.andExpect(status().isBadRequest());
		for (String incomplete : List.of("{\"matchAt\": \"%s\"}".formatted(match),
				"{\"id\": \"%s\", \"matchAt\": \"%s\"}".formatted(UUID.randomUUID(), match))) {
			mvc.perform(post("/api/me/matches").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content(incomplete)).andExpect(status().isBadRequest());
		}
		assertThat(repository.count()).isZero();

		assertThat(WebPushGateway.isPushService("https://updates.push.services.mozilla.com/wpush/v2/abc")).isTrue();
		assertThat(WebPushGateway.isPushService("https://web.push.apple.com/abc")).isTrue();
		assertThat(WebPushGateway.isPushService("https://wns2-par02p.notify.windows.com/w/?token=abc")).isTrue();
	}

	/** El partido con ese id (en cada test, de un solo jugador). */
	private MatchReminder match(UUID id) {
		List<MatchReminder> found = repository.findAll()
			.stream()
			.filter(reminder -> reminder.getId().equals(id))
			.toList();
		assertThat(found).hasSize(1);
		return found.getFirst();
	}

	/** Dentro de ese tiempo, en segundos justos: la base de datos no guarda los nanosegundos. */
	private static Instant in(Duration duration) {
		return Instant.now().plus(duration).truncatedTo(ChronoUnit.SECONDS);
	}

	private ResultActions saveMatch(String token, UUID id, Instant matchAt, String endpoint, boolean weekly)
			throws Exception {
		return mvc.perform(post("/api/me/matches").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"id": "%s", "matchAt": "%s", "weekly": %s, "timeZone": "Europe/Madrid",
					 "subscription": {"endpoint": "%s",
					 "p256dh": "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
					 "auth": "BTBZMqHH6r4Tts7J_aSIgg"}}
					""".formatted(id, matchAt, weekly, endpoint)));
	}

	private ResultActions removeMatch(String token, UUID id) throws Exception {
		return mvc.perform(delete("/api/me/matches/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	/** Como lo mandaba la app cuando solo cabía un partido (y aún puede quedar en la cola de algún móvil). */
	private ResultActions remindTheOldWay(String token, Instant matchAt, String endpoint) throws Exception {
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
