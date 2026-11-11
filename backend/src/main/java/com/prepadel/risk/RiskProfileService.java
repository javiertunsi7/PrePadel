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
