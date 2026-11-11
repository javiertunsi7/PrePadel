package com.prepadel.risk;

import java.util.List;
import java.util.Map;

import com.prepadel.player.SkillLevel;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RiskProfileServiceTest {

	private static final List<String> ZONES = List.of("ELBOW", "SHOULDER", "KNEE");

	private final RiskProfileService service = new RiskProfileService();

	@Test
	void strongPainIsHighRiskEvenForAYoungAdvancedPlayerWhoPlaysLittle() {
		List<ZoneRisk> risks = service.assess(36, 1, SkillLevel.ADVANCED, Map.of("ELBOW", 8), ZONES);

		assertThat(riskOf(risks, "ELBOW").level()).isEqualTo(RiskLevel.HIGH);
		assertThat(riskOf(risks, "ELBOW").lastPain()).isEqualTo(8);
		assertThat(riskOf(risks, "KNEE").level()).isEqualTo(RiskLevel.LOW);
		assertThat(riskOf(risks, "KNEE").lastPain()).isNull();
	}

	@Test
	void noPainAndLightLoadIsLowRiskEverywhere() {
		List<ZoneRisk> risks = service.assess(38, 2, SkillLevel.INTERMEDIATE, Map.of(), ZONES);

		assertThat(risks).extracting(ZoneRisk::zone).containsExactly("ELBOW", "SHOULDER", "KNEE");
		assertThat(risks).allSatisfy(risk -> assertThat(risk.level()).isEqualTo(RiskLevel.LOW));
	}

	@Test
	void ageWeeklyLoadAndBeingABeginnerRaiseTheRiskOfEveryZone() {
		List<ZoneRisk> risks = service.assess(52, 6, SkillLevel.BEGINNER, Map.of(), ZONES);

		assertThat(risks).allSatisfy(risk -> {
			assertThat(risk.level()).isEqualTo(RiskLevel.MODERATE);
			assertThat(risk.reasons()).containsExactly("Juegas 6 horas a la semana", "Tienes 52 años",
					"Estás empezando a jugar");
		});
	}

	@Test
	void moderatePainOnlyRaisesTheZoneThatHurts() {
		List<ZoneRisk> risks = service.assess(47, 4, SkillLevel.INTERMEDIATE, Map.of("KNEE", 4), ZONES);

		assertThat(riskOf(risks, "KNEE").level()).isEqualTo(RiskLevel.MODERATE);
		assertThat(riskOf(risks, "KNEE").reasons()).first().isEqualTo("Molestia actual de 4/10");
		assertThat(riskOf(risks, "ELBOW").level()).isEqualTo(RiskLevel.LOW);
	}

	@Test
	void scoreNeverGoesAboveOneHundred() {
		List<ZoneRisk> risks = service.assess(60, 20, SkillLevel.BEGINNER, Map.of("SHOULDER", 10), ZONES);

		assertThat(riskOf(risks, "SHOULDER").score()).isLessThanOrEqualTo(100);
	}

	@Test
	void priorityZoneIsTheOneThatHurtsMost() {
		List<ZoneRisk> risks = service.assess(45, 4, SkillLevel.INTERMEDIATE, Map.of("ELBOW", 3, "KNEE", 6), ZONES);

		assertThat(service.priorityZone(risks)).contains("KNEE");
	}

	@Test
	void thereIsNoPriorityZoneWhenNothingHurtsAndRiskIsLow() {
		List<ZoneRisk> risks = service.assess(38, 2, SkillLevel.ADVANCED, Map.of("ELBOW", 0), ZONES);

		assertThat(service.priorityZone(risks)).isEmpty();
	}

	@Test
	void tiesAreResolvedInTheOrderTheZonesAreShown() {
		List<ZoneRisk> risks = service.assess(52, 6, SkillLevel.BEGINNER, Map.of(), ZONES);

		assertThat(service.priorityZone(risks)).contains("ELBOW");
	}

	private static ZoneRisk riskOf(List<ZoneRisk> risks, String zone) {
		return risks.stream().filter(risk -> risk.zone().equals(zone)).findFirst().orElseThrow();
	}

}
