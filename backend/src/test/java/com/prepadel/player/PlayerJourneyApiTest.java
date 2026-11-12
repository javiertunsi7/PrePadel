package com.prepadel.player;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import com.prepadel.pain.PainEntryRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Recorre la API como lo hace la app: cuestionario, programa, rutinas, dolor y baja. */
@SpringBootTest
@ActiveProfiles("test")
class PlayerJourneyApiTest {

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private PainEntryRepository painRepository;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	@Test
	void contentIsPublicAndIncludesThePainRule() throws Exception {
		mvc.perform(get("/api/content"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.zones", hasSize(3)))
				.andExpect(jsonPath("$.programs", hasSize(3)))
				.andExpect(jsonPath("$.painRule.consultScore").value(7))
				.andExpect(jsonPath("$.review.status").exists());
	}

	@Test
	void questionnaireBuildsTheRiskProfileAndRecommendsTheProgramOfTheZoneThatHurts() throws Exception {
		String token = register(6, 0, 2);

		mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.profile.age").value(47))
				.andExpect(jsonPath("$.risk[0].zone").value("ELBOW"))
				.andExpect(jsonPath("$.risk[0].level").value("HIGH"))
				.andExpect(jsonPath("$.risk[1].level").value("LOW"))
				.andExpect(jsonPath("$.risk[2].level").value("MODERATE"))
				.andExpect(jsonPath("$.recommendedProgram").value("codo-de-padel"))
				.andExpect(jsonPath("$.enrollment").isEmpty())
				.andExpect(jsonPath("$.pain", hasSize(3)))
				.andExpect(jsonPath("$.pain[0].context").value("ONBOARDING"));
	}

	@Test
	void questionnaireIsRejectedWithoutHealthDataConsent() throws Exception {
		mvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"ELBOW": 3}, "healthDataConsent": false}
				""")).andExpect(status().isBadRequest());
	}

	@Test
	void questionnaireIsRejectedWithUnknownZonesOrScoresOutOfRange() throws Exception {
		mvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"NECK": 3}, "healthDataConsent": true}
				""")).andExpect(status().isBadRequest());

		mvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"ELBOW": 11}, "healthDataConsent": true}
				""")).andExpect(status().isBadRequest());
	}

	@Test
	void playerDataNeedsAValidToken() throws Exception {
		mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, bearer("no-existe")))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void programAdvancesToTheNextWeekAfterThreeSessions() throws Exception {
		String token = register(5, 0, 0);

		enroll(token, "codo-de-padel")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.enrollment.programSlug").value("codo-de-padel"))
				.andExpect(jsonPath("$.enrollment.currentWeek").value(1))
				.andExpect(jsonPath("$.enrollment.totalWeeks").value(4))
				.andExpect(jsonPath("$.enrollment.sessionsDoneThisWeek").value(0))
				.andExpect(jsonPath("$.enrollment.routineSlug").value("codo-semana-1"));

		// La app reintenta lo que no pudo enviar: el mismo id no cuenta dos veces.
		String firstSession = UUID.randomUUID().toString();
		complete(token, firstSession, "codo-semana-1").andExpect(status().isOk());
		complete(token, firstSession, "codo-semana-1")
				.andExpect(jsonPath("$.enrollment.sessionsDoneThisWeek").value(1));

		// El calentamiento se guarda, pero no cuenta como sesión del programa.
		complete(token, UUID.randomUUID().toString(), "calentamiento-prepartido")
				.andExpect(jsonPath("$.enrollment.sessionsDoneThisWeek").value(1))
				.andExpect(jsonPath("$.recentCompletions", hasSize(2)));

		complete(token, UUID.randomUUID().toString(), "codo-semana-1");
		complete(token, UUID.randomUUID().toString(), "codo-semana-1")
				.andExpect(jsonPath("$.enrollment.currentWeek").value(2))
				.andExpect(jsonPath("$.enrollment.sessionsDoneThisWeek").value(0))
				.andExpect(jsonPath("$.enrollment.routineSlug").value("codo-semana-2"))
				.andExpect(jsonPath("$.enrollment.completed").value(false));
	}

	@Test
	void programIsCompletedAfterTwelveSessionsAndCanBeStartedAgain() throws Exception {
		String token = register(0, 4, 0);
		enroll(token, "hombro-de-remate");

		for (int week = 1; week <= 4; week++) {
			for (int session = 1; session <= 3; session++) {
				complete(token, UUID.randomUUID().toString(), "hombro-semana-" + week).andExpect(status().isOk());
			}
		}

		mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
				.andExpect(jsonPath("$.enrollment.completed").value(true))
				.andExpect(jsonPath("$.enrollment.currentWeek").value(4));

		enroll(token, "hombro-de-remate")
				.andExpect(jsonPath("$.enrollment.completed").value(false))
				.andExpect(jsonPath("$.enrollment.currentWeek").value(1));
	}

	@Test
	void switchingProgramReplacesTheActiveOne() throws Exception {
		String token = register(3, 0, 3);
		enroll(token, "codo-de-padel");

		enroll(token, "rodilla-estable")
				.andExpect(jsonPath("$.enrollment.programSlug").value("rodilla-estable"))
				.andExpect(jsonPath("$.enrollment.routineSlug").value("rodilla-semana-1"));

		enroll(token, "no-existe").andExpect(status().isNotFound());
	}

	@Test
	void highPainAfterAMatchRaisesAConsultAlertAndTheRiskOfThatZone() throws Exception {
		String token = register(0, 0, 0);

		logPain(token, UUID.randomUUID().toString(), "KNEE", 8)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.alerts", hasSize(1)))
				.andExpect(jsonPath("$.alerts[0].zone").value("KNEE"))
				.andExpect(jsonPath("$.alerts[0].kind").value("HIGH_PAIN"))
				.andExpect(jsonPath("$.risk[2].level").value("HIGH"))
				.andExpect(jsonPath("$.recommendedProgram").value("rodilla-estable"))
				.andExpect(jsonPath("$.pain[0].score").value(8))
				.andExpect(jsonPath("$.pain[0].context").value("POST_MATCH"));
	}

	@Test
	void painLogRejectsUnknownZonesAndScoresOutOfRange() throws Exception {
		String token = register(0, 0, 0);

		logPain(token, UUID.randomUUID().toString(), "NECK", 3).andExpect(status().isBadRequest());
		logPain(token, UUID.randomUUID().toString(), "KNEE", 11).andExpect(status().isBadRequest());
	}

	@Test
	void deletingTheAccountErasesHealthDataAndInvalidatesTheToken() throws Exception {
		String token = register(2, 2, 2);
		logPain(token, UUID.randomUUID().toString(), "ELBOW", 4).andExpect(status().isOk());
		long entriesBefore = painRepository.count();

		mvc.perform(delete("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
				.andExpect(status().isNoContent());

		assertThat(painRepository.count()).isEqualTo(entriesBefore - 4);
		mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
				.andExpect(status().isUnauthorized());
	}

	/** Jugador de 47 años, 4 horas a la semana, nivel medio. */
	@Test
	void thePlayerCanDownloadEverythingTheServerKeepsAboutThem() throws Exception {
		String token = register(6, 0, 2);
		enroll(token, "codo-de-padel").andExpect(status().isOk());
		mvc.perform(post("/api/me/pain").header(HttpHeaders.AUTHORIZATION, bearer(token))
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"id\": \"%s\", \"zone\": \"KNEE\", \"score\": 4}".formatted(UUID.randomUUID())))
			.andExpect(status().isOk());

		mvc.perform(get("/api/me/export").header(HttpHeaders.AUTHORIZATION, bearer(token)))
			.andExpect(status().isOk())
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
				.string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"prepadel-mis-datos.json\""))
			.andExpect(jsonPath("$.profile.age").value(47))
			.andExpect(jsonPath("$.profile.consentAt").isString())
			.andExpect(jsonPath("$.pain", hasSize(4)))
			.andExpect(jsonPath("$.pain[3].zone").value("KNEE"))
			.andExpect(jsonPath("$.programs[0].program").value("codo-de-padel"))
			.andExpect(jsonPath("$.completedRoutines").isArray())
			.andExpect(jsonPath("$.nextMatch").isEmpty())
			.andExpect(jsonPath("$.tokenHash").doesNotExist());

		mvc.perform(get("/api/me/export")).andExpect(status().isUnauthorized());
	}

	private String register(int elbow, int shoulder, int knee) throws Exception {
		String body = mvc.perform(post("/api/players").contentType(MediaType.APPLICATION_JSON).content("""
				{"age": 47, "weeklyHours": 4, "level": "INTERMEDIATE",
				 "discomfort": {"ELBOW": %d, "SHOULDER": %d, "KNEE": %d},
				 "healthDataConsent": true}
				""".formatted(elbow, shoulder, knee)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.state.profile.level").value("INTERMEDIATE"))
				.andReturn()
				.getResponse()
				.getContentAsString(StandardCharsets.UTF_8);
		return JsonPath.read(body, "$.token");
	}

	private ResultActions enroll(String token, String programSlug) throws Exception {
		return mvc.perform(post("/api/me/enrollment").header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"programSlug\": \"%s\"}".formatted(programSlug)));
	}

	private ResultActions complete(String token, String id, String routineSlug) throws Exception {
		return mvc.perform(post("/api/me/completions").header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\": \"%s\", \"routineSlug\": \"%s\"}".formatted(id, routineSlug)));
	}

	private ResultActions logPain(String token, String id, String zone, int score) throws Exception {
		return mvc.perform(post("/api/me/pain").header(HttpHeaders.AUTHORIZATION, bearer(token))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\": \"%s\", \"zone\": \"%s\", \"score\": %d}".formatted(id, zone, score)));
	}

	private static String bearer(String token) {
		return "Bearer " + token;
	}

}
