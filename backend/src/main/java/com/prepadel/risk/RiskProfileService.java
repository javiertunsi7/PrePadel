package com.prepadel.risk;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.prepadel.player.SkillLevel;

import org.springframework.stereotype.Service;

/**
 * Perfil de riesgo orientativo a partir del cuestionario. Es una heurística
 * sencilla para priorizar qué zona trabajar, no un diagnóstico: los pesos
 * deben calibrarse con el fisioterapeuta que valide el contenido.
 *
 * <p>Puntos (0 a 100) = dolor actual x 7 + carga semanal + edad + nivel.
 */
@Service
public class RiskProfileService {

	static final int MODERATE_FROM = 25;
	static final int HIGH_FROM = 55;

	private static final int POINTS_PER_PAIN_POINT = 7;

	/**
	 * @param latestPainByZone último dolor (0 a 10) por zona; las zonas sin registro no aparecen
	 * @param zones            zonas a evaluar, en el orden en que se muestran
	 */
	public List<ZoneRisk> assess(int age, int weeklyHours, SkillLevel level, Map<String, Integer> latestPainByZone,
			List<String> zones) {
		int profilePoints = loadPoints(weeklyHours) + agePoints(age) + levelPoints(level);

		List<String> profileReasons = new ArrayList<>();
		if (weeklyHours >= 4) {
			profileReasons.add("Juegas %d horas a la semana".formatted(weeklyHours));
		}
		if (age >= 45) {
			profileReasons.add("Tienes %d años".formatted(age));
		}
		if (level == SkillLevel.BEGINNER) {
			profileReasons.add("Estás empezando a jugar");
		}

		return zones.stream().map(zone -> {
			Integer lastPain = latestPainByZone.get(zone);
			int pain = lastPain == null ? 0 : lastPain;
			int score = Math.min(100, pain * POINTS_PER_PAIN_POINT + profilePoints);

			List<String> reasons = new ArrayList<>();
			if (pain > 0) {
				reasons.add("Molestia actual de %d/10".formatted(pain));
			}
			reasons.addAll(profileReasons);
			return new ZoneRisk(zone, levelFor(score), score, lastPain, List.copyOf(reasons));
		}).toList();
	}

	/**
	 * Zona que más conviene trabajar: la de mayor puntuación entre las que duelen
	 * o tienen riesgo apreciable. A igualdad, la primera en el orden de las zonas.
	 */
	public Optional<String> priorityZone(List<ZoneRisk> risks) {
		return risks.stream()
				.filter(risk -> risk.level() != RiskLevel.LOW || (risk.lastPain() != null && risk.lastPain() > 0))
				.max(Comparator.comparingInt(ZoneRisk::score))
				.map(ZoneRisk::zone);
	}

	/**
	 * Los pesos explicados en frases, para que los revise el fisioterapeuta.
	 * Se calculan con las mismas funciones que el perfil: si cambia un peso, cambia el texto.
	 */
	public static List<String> describeWeights() {
		return List.of(
				"Cada punto de dolor actual (0 a 10) suma %d puntos.".formatted(POINTS_PER_PAIN_POINT),
				"Horas de juego a la semana: 2 o 3 suman %d; 4 o 5 suman %d; 6 o más suman %d."
					.formatted(loadPoints(2), loadPoints(4), loadPoints(6)),
				"Edad: de 40 a 44 suma %d; de 45 a 49 suma %d; 50 o más suma %d."
					.formatted(agePoints(40), agePoints(45), agePoints(50)),
				"Estar empezando a jugar suma %d.".formatted(levelPoints(SkillLevel.BEGINNER)),
				"Riesgo moderado desde %d puntos y alto desde %d (máximo 100).".formatted(MODERATE_FROM, HIGH_FROM));
	}

	private static RiskLevel levelFor(int score) {
		if (score >= HIGH_FROM) {
			return RiskLevel.HIGH;
		}
		return score >= MODERATE_FROM ? RiskLevel.MODERATE : RiskLevel.LOW;
	}

	private static int loadPoints(int weeklyHours) {
		if (weeklyHours >= 6) {
			return 12;
		}
		if (weeklyHours >= 4) {
			return 8;
		}
		return weeklyHours >= 2 ? 4 : 0;
	}

	private static int agePoints(int age) {
		if (age >= 50) {
			return 10;
		}
		if (age >= 45) {
			return 7;
		}
		return age >= 40 ? 4 : 0;
	}

	private static int levelPoints(SkillLevel level) {
		return level == SkillLevel.BEGINNER ? 5 : 0;
	}

}
