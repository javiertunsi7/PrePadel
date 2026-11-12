package com.prepadel.stats;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import com.prepadel.stats.RetentionStats.AbandonedExercise;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El registro de rutinas abandonadas y el panel que lo resume. */
@SpringBootTest(properties = "prepadel.admin.password=clave-de-prueba")
@ActiveProfiles("test")
class RetentionPanelTest {

	private static final String ROUTINE = "calentamiento-prepartido";

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private RetentionStatsService statsService;

	@Autowired
	private JdbcTemplate jdbc;

	private MockMvc mvc;

	private String exercise;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		exercise = jdbc.queryForObject(
				"select exercise_slug from routine_step where routine_slug = ? order by step_order fetch first 1 rows only",
				String.class, ROUTINE);
	}

	// Otros tests comparten la base de datos en memoria: se comprueba lo que cambia, no el total.
	@Test
	void countsActivePlayersSecondWeekReturnAndWhereRoutinesAreAbandoned() {
		RetentionStats before = statsService.stats();
		Instant now = Instant.now();

		UUID cameBack = player(now.minus(Duration.ofDays(20)));
		completion(cameBack, now.minus(Duration.ofDays(12))); // día 8 desde el alta
		UUID triedOnce = player(now.minus(Duration.ofDays(20)));
		completion(triedOnce, now.minus(Duration.ofDays(18))); // día 2: no cuenta como vuelta
		UUID newcomer = player(now.minus(Duration.ofDays(1)));
		completion(newcomer, now.minus(Duration.ofHours(2)));
		abandonment(newcomer, now.minus(Duration.ofHours(1)));
		abandonment(cameBack, now.minus(Duration.ofDays(3)));

		RetentionStats after = statsService.stats();

		assertThat(after.players() - before.players()).isEqualTo(3);
		assertThat(after.newPlayers7d() - before.newPlayers7d()).isEqualTo(1);
		assertThat(after.active7d() - before.active7d()).isEqualTo(1);
		assertThat(after.active30d() - before.active30d()).isEqualTo(3);
		assertThat(after.cohort() - before.cohort()).isEqualTo(2);
		assertThat(after.retained() - before.retained()).isEqualTo(1);
		assertThat(after.retentionPercent()).isBetween(0, 100);
		assertThat(after.completions30d() - before.completions30d()).isEqualTo(3);
		assertThat(after.abandonments30d() - before.abandonments30d()).isEqualTo(2);
		assertThat(after.abandonedExercises()).extracting(AbandonedExercise::times).first().satisfies(
				times -> assertThat(times).isGreaterThanOrEqualTo(2));
	}

	@Test
	void leavingARoutineIsRecordedOnceAndOnlyForExercisesOfThatRoutine() throws Exception {
		String body = mvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"ELBOW": 3, "SHOULDER": 0, "KNEE": 0},
				 "healthDataConsent": true}
				""")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
		String bearer = "Bearer " + JsonPath.<String>read(body, "$.token");
		UUID id = UUID.randomUUID();
		String abandonment = """
				{"id": "%s", "routineSlug": "%s", "exerciseSlug": "%s"}
				""".formatted(id, ROUTINE, exercise);

		for (int attempt = 0; attempt < 2; attempt++) {
			mvc.perform(post("/api/me/abandonments").header(HttpHeaders.AUTHORIZATION, bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.content(abandonment)).andExpect(status().isOk()).andExpect(jsonPath("$.profile").exists());
		}
		assertThat(jdbc.queryForObject("select count(*) from routine_abandonment where id = ?", Long.class, id))
			.isEqualTo(1);

		mvc.perform(post("/api/me/abandonments").header(HttpHeaders.AUTHORIZATION, bearer)
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"id": "%s", "routineSlug": "%s", "exerciseSlug": "no-existe"}
					""".formatted(UUID.randomUUID(), ROUTINE))).andExpect(status().isBadRequest());

		mvc.perform(post("/api/me/abandonments").contentType(MediaType.APPLICATION_JSON).content(abandonment))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void thePanelAsksForThePasswordAndShowsOnlyTotals() throws Exception {
		mvc.perform(get("/api/admin/panel"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, containsString("Basic")));
		mvc.perform(get("/api/admin/stats").header(HttpHeaders.AUTHORIZATION, basic("otra-clave")))
			.andExpect(status().isUnauthorized());

		mvc.perform(get("/api/admin/stats").header(HttpHeaders.AUTHORIZATION, basic("clave-de-prueba")))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
			.andExpect(jsonPath("$.players").isNumber())
			.andExpect(jsonPath("$.abandonedExercises").isArray());
		mvc.perform(get("/api/admin/panel").header(HttpHeaders.AUTHORIZATION, basic("clave-de-prueba")))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
			.andExpect(content().string(containsString("Ejercicios donde más se abandona")));
	}

	private static String basic(String password) {
		return "Basic " + Base64.getEncoder().encodeToString(("javier:" + password).getBytes(StandardCharsets.UTF_8));
	}

	private UUID player(Instant createdAt) {
		UUID id = UUID.randomUUID();
		jdbc.update("""
				insert into player (id, token_hash, age, weekly_hours, skill_level, consent_version, consent_at, created_at)
				values (?, ?, 45, 3, 'INTERMEDIATE', 'test', ?, ?)
				""", id, id.toString(), at(createdAt), at(createdAt));
		return id;
	}

	private void completion(UUID playerId, Instant when) {
		jdbc.update("insert into routine_completion (id, player_id, routine_slug, completed_at) values (?, ?, ?, ?)",
				UUID.randomUUID(), playerId, ROUTINE, at(when));
	}

	private void abandonment(UUID playerId, Instant when) {
		jdbc.update("""
				insert into routine_abandonment (id, player_id, routine_slug, exercise_slug, abandoned_at)
				values (?, ?, ?, ?, ?)
				""", UUID.randomUUID(), playerId, ROUTINE, exercise, at(when));
	}

	private static OffsetDateTime at(Instant instant) {
		return instant.atOffset(ZoneOffset.UTC);
	}

}
