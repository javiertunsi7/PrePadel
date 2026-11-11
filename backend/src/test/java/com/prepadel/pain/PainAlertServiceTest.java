package com.prepadel.pain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PainAlertServiceTest {

	private static final Instant NOW = Instant.parse("2026-11-10T19:00:00Z");
	private static final UUID PLAYER = UUID.randomUUID();
	private static final Map<String, String> ZONES = zones();

	/** Consulta a partir de 7; o 4 o más durante 10 días. */
	private final PainAlertService service = new PainAlertService(new PainRules(7, 4, 10));

	@Test
	void painAtTheConsultScoreTellsThePlayerToStopAndSeeAProfessional() {
		List<PainAlert> alerts = service.evaluate(List.of(entry("ELBOW", 7, 0)), ZONES);

		assertThat(alerts).singleElement().satisfies(alert -> {
			assertThat(alert.zone()).isEqualTo("ELBOW");
			assertThat(alert.kind()).isEqualTo(PainAlert.Kind.HIGH_PAIN);
			assertThat(alert.message()).startsWith("Codo: dolor de 7/10");
		});
	}

	@Test
	void mildPainRaisesNoAlert() {
		assertThat(service.evaluate(List.of(entry("ELBOW", 3, 0), entry("KNEE", 6, 0)), ZONES)).isEmpty();
	}

	@Test
	void onlyTheLatestEntryCountsForHighPain() {
		List<PainEntry> entries = List.of(entry("ELBOW", 3, 0), entry("ELBOW", 9, 2));

		assertThat(service.evaluate(entries, ZONES)).isEmpty();
	}

	@Test
	void moderatePainThatDoesNotGoDownInTenDaysRaisesAnAlert() {
		List<PainEntry> entries = List.of(entry("KNEE", 5, 0), entry("KNEE", 4, 5), entry("KNEE", 6, 11));

		assertThat(service.evaluate(entries, ZONES)).singleElement().satisfies(alert -> {
			assertThat(alert.zone()).isEqualTo("KNEE");
			assertThat(alert.kind()).isEqualTo(PainAlert.Kind.PERSISTENT_PAIN);
		});
	}

	@Test
	void aGoodDayInBetweenRestartsTheCount() {
		List<PainEntry> entries = List.of(entry("KNEE", 5, 0), entry("KNEE", 2, 5), entry("KNEE", 6, 11));

		assertThat(service.evaluate(entries, ZONES)).isEmpty();
	}

	@Test
	void moderatePainForJustAFewDaysRaisesNoAlert() {
		List<PainEntry> entries = List.of(entry("KNEE", 5, 0), entry("KNEE", 5, 6));

		assertThat(service.evaluate(entries, ZONES)).isEmpty();
	}

	@Test
	void eachZoneIsJudgedOnItsOwnEntries() {
		List<PainEntry> entries = List.of(entry("KNEE", 8, 0), entry("ELBOW", 1, 0), entry("ELBOW", 5, 12));

		assertThat(service.evaluate(entries, ZONES)).extracting(PainAlert::zone).containsExactly("KNEE");
	}

	private static PainEntry entry(String zone, int score, int daysAgo) {
		return new PainEntry(UUID.randomUUID(), PLAYER, zone, score, PainContext.POST_MATCH,
				NOW.minus(daysAgo, ChronoUnit.DAYS));
	}

	private static Map<String, String> zones() {
		Map<String, String> zones = new LinkedHashMap<>();
		zones.put("ELBOW", "Codo");
		zones.put("KNEE", "Rodilla");
		return zones;
	}

}
