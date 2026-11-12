package com.prepadel.web;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El servidor como único desplegable: sirve la web (aquí, la de prueba de
 * src/test/resources/static) además de la API.
 */
@SpringBootTest
@ActiveProfiles("test")
class StaticWebTest {

	@Autowired
	private WebApplicationContext context;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	@Test
	void theRootAddressOpensTheWebApp() throws Exception {
		mvc.perform(get("/")).andExpect(status().isOk()).andExpect(forwardedUrl("index.html"));
	}

	@Test
	void appScreensGetTheWebAppSoLinksAndReloadsWork() throws Exception {
		List<String> screens = List.of("/bienvenida", "/programas", "/programas/codo-de-padel", "/dolor",
				"/perfil/ejercicios", "/rutina/calentamiento-prepartido");
		for (String screen : screens) {
			mvc.perform(get(screen))
				.andExpect(status().isOk())
				.andExpect(content().string(containsString("web-de-prueba")))
				.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-cache"));
		}
	}

	@Test
	void fingerprintedFilesAreCachedForAYear() throws Exception {
		mvc.perform(get("/assets/app-abc123.js"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable"));
	}

	@Test
	void theServiceWorkerIsRevalidatedOnEveryVisitSoUpdatesArrive() throws Exception {
		mvc.perform(get("/sw.js"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-cache"));
	}

	/** Dentro del jar todo tiene fecha de 1980: con Last-Modified, una web nueva contestaría 304. */
	@Test
	void aNewVersionOfTheWebIsNeverAnsweredAsNotModified() throws Exception {
		for (String path : List.of("/", "/sw.js", "/programas")) {
			mvc.perform(get(path).header(HttpHeaders.IF_MODIFIED_SINCE, "Fri, 01 Feb 1980 00:00:00 GMT"))
				.andExpect(status().isOk())
				.andExpect(header().doesNotExist(HttpHeaders.LAST_MODIFIED));
		}
	}

	@Test
	void theInstallableAppManifestIsServedWithItsOwnContentType() throws Exception {
		mvc.perform(get("/manifest.webmanifest"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith("application/manifest+json"));
	}

	@Test
	void missingFilesAndUnknownApiRoutesAreNotAnsweredWithTheWebApp() throws Exception {
		mvc.perform(get("/assets/no-existe.js")).andExpect(status().isNotFound());
		mvc.perform(get("/icons/no-existe.png")).andExpect(status().isNotFound());
		mvc.perform(get("/api/no-existe")).andExpect(status().isNotFound());
	}

	@Test
	void theApiKeepsAnsweringJson() throws Exception {
		mvc.perform(get("/api/content"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
	}

	@Test
	void theHealthCheckReportsThatTheAppAndItsDatabaseAreUp() throws Exception {
		mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void onlyAppScreensFallBackToTheWebApp() {
		assertThat(StaticWebConfig.AppRouteResolver.isAppRoute("programas/codo-de-padel")).isTrue();
		assertThat(StaticWebConfig.AppRouteResolver.isAppRoute("")).isTrue();
		assertThat(StaticWebConfig.AppRouteResolver.isAppRoute("api/me")).isFalse();
		assertThat(StaticWebConfig.AppRouteResolver.isAppRoute("actuator/health")).isFalse();
		assertThat(StaticWebConfig.AppRouteResolver.isAppRoute("assets/app-abc123.js")).isFalse();
	}

}
