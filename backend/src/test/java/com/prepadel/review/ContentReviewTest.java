package com.prepadel.review;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** El fisioterapeuta revisa pieza a pieza; el aviso de borrador solo se quita con todo aprobado y firmado. */
@SpringBootTest(properties = "prepadel.review.password=clave-del-fisio")
@ActiveProfiles("test")
class ContentReviewTest {

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private ReviewService service;

	@Autowired
	private JdbcTemplate jdbc;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		reset();
	}

	// La base de datos en memoria es compartida con otros tests: se deja como estaba.
	@AfterEach
	void reset() {
		jdbc.update("delete from review_item");
		jdbc.update("update content_review set status = 'DRAFT', reviewer_name = null, reviewer_credentials = null,"
				+ " reviewed_on = null where id = 1");
	}

	@Test
	void listsEveryPieceToReviewWithTheRiskWeightsInWords() throws Exception {
		mvc.perform(get("/api/review").header(HttpHeaders.AUTHORIZATION, basic("clave-del-fisio")))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
			.andExpect(jsonPath("$.status").value("DRAFT"))
			.andExpect(jsonPath("$.approved").value(0))
			.andExpect(jsonPath("$.items[0].key").value("rule:pain"))
			.andExpect(jsonPath("$.items[1].key").value("rule:risk"))
			.andExpect(jsonPath("$.items[2].key").value(org.hamcrest.Matchers.startsWith("exercise:")))
			.andExpect(jsonPath("$.items[0].state").value("PENDING"))
			.andExpect(jsonPath("$.riskWeights[0]").value("Cada punto de dolor actual (0 a 10) suma 7 puntos."));

		List<String> keys = keys();
		assertThat(keys).anyMatch(key -> key.startsWith("routine:")).anyMatch(key -> key.startsWith("program:"));
		assertThat(keys).doesNotHaveDuplicates();
	}

	@Test
	void theDraftNoticeGoesOnlyWhenEverythingIsApprovedAndSigned() throws Exception {
		List<String> keys = keys();
		for (String key : keys) {
			judge(key, "APPROVED", null).andExpect(status().isOk());
		}
		assertThat(publicStatus()).isEqualTo("DRAFT"); // falta la firma

		mvc.perform(put("/api/review/reviewer").header(HttpHeaders.AUTHORIZATION, basic("clave-del-fisio"))
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"name": "Ana Ruiz", "credentials": "Fisioterapeuta, col. 1234"}
					""")).andExpect(status().isOk()).andExpect(jsonPath("$.approved").value(keys.size()));

		mvc.perform(get("/api/content"))
			.andExpect(jsonPath("$.review.status").value("REVIEWED"))
			.andExpect(jsonPath("$.review.reviewerName").value("Ana Ruiz"))
			.andExpect(jsonPath("$.review.reviewerCredentials").value("Fisioterapeuta, col. 1234"))
			.andExpect(jsonPath("$.review.reviewedOn").exists());

		judge(keys.get(5), "CHANGES", "Bajar a 10 repeticiones").andExpect(status().isOk())
			.andExpect(jsonPath("$.items[5].state").value("CHANGES"))
			.andExpect(jsonPath("$.items[5].comment").value("Bajar a 10 repeticiones"));
		assertThat(publicStatus()).isEqualTo("DRAFT");
	}

	@Test
	void changingAnApprovedExerciseAfterwardsPutsTheContentBackToDraft() throws Exception {
		mvc.perform(put("/api/review/reviewer").header(HttpHeaders.AUTHORIZATION, basic("clave-del-fisio"))
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\": \"Ana Ruiz\"}")).andExpect(status().isOk());
		for (String key : keys()) {
			judge(key, "APPROVED", null);
		}
		assertThat(publicStatus()).isEqualTo("REVIEWED");

		String slug = keys().stream().filter(key -> key.startsWith("exercise:")).findFirst().orElseThrow().substring(9);
		String original = jdbc.queryForObject("select instructions from exercise where slug = ?", String.class, slug);
		try {
			// Lo que haría una migración nueva que cambia el texto del ejercicio.
			jdbc.update("update exercise set instructions = ? where slug = ?", original + " Más despacio.", slug);
			service.refreshOnStartup();

			assertThat(publicStatus()).isEqualTo("DRAFT");
			mvc.perform(get("/api/review").header(HttpHeaders.AUTHORIZATION, basic("clave-del-fisio")))
				.andExpect(jsonPath("$.items[?(@.key == 'exercise:" + slug + "')].state").value("PENDING"))
				.andExpect(jsonPath("$.items[?(@.key == 'exercise:" + slug + "')].outdated").value(true));
		} finally {
			jdbc.update("update exercise set instructions = ? where slug = ?", original, slug);
		}
	}

	@Test
	void askingForChangesNeedsAComment() throws Exception {
		judge("rule:pain", "CHANGES", "  ").andExpect(status().isBadRequest());
		judge("exercise:no-existe", "APPROVED", null).andExpect(status().isNotFound());
	}

	@Test
	void withoutTheRightPasswordNothingIsShownAndTheBrowserDoesNotPopUpItsOwnPrompt() throws Exception {
		mvc.perform(get("/api/review"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().doesNotExist(HttpHeaders.WWW_AUTHENTICATE));
		mvc.perform(get("/api/review").header(HttpHeaders.AUTHORIZATION, basic("otra")))
			.andExpect(status().isUnauthorized());
		judge("rule:pain", "APPROVED", null, basic("otra")).andExpect(status().isUnauthorized());
	}

	private List<String> keys() throws Exception {
		String body = mvc.perform(get("/api/review").header(HttpHeaders.AUTHORIZATION, basic("clave-del-fisio")))
			.andReturn()
			.getResponse()
			.getContentAsString(StandardCharsets.UTF_8);
		return JsonPath.read(body, "$.items[*].key");
	}

	private String publicStatus() throws Exception {
		String body = mvc.perform(get("/api/content")).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
		return JsonPath.read(body, "$.review.status");
	}

	private ResultActions judge(String key, String verdict, String comment) throws Exception {
		return judge(key, verdict, comment, basic("clave-del-fisio"));
	}

	private ResultActions judge(String key, String verdict, String comment, String authorization) throws Exception {
		return mvc.perform(put("/api/review/items/{key}", key).header(HttpHeaders.AUTHORIZATION, authorization)
			.contentType(MediaType.APPLICATION_JSON)
			.content(comment == null ? "{\"verdict\": \"%s\"}".formatted(verdict)
					: "{\"verdict\": \"%s\", \"comment\": \"%s\"}".formatted(verdict, comment)));
	}

	private static String basic(String password) {
		return "Basic " + Base64.getEncoder().encodeToString((":" + password).getBytes(StandardCharsets.UTF_8));
	}

}
