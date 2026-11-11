package com.prepadel.player;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.prepadel.pain.PainAlert;
import com.prepadel.pain.PainContext;
import com.prepadel.pain.PainEntry;
import com.prepadel.progress.ProgressService.EnrollmentProgress;
import com.prepadel.progress.RoutineCompletion;
import com.prepadel.risk.ZoneRisk;

/**
 * Todo lo que la app necesita saber del jugador, en una sola respuesta. La
 * devuelven también todas las acciones (registrar dolor, completar rutina...)
 * para que el móvil guarde siempre una copia al día y funcione sin cobertura.
 *
 * @param recommendedProgram slug del programa aconsejado según el riesgo, o null
 * @param enrollment         programa activo y por dónde va, o null
 * @param recentCompletions  rutinas terminadas en las últimas semanas, la más reciente primero
 * @param pain               registros de dolor de los últimos meses, el más reciente primero
 * @param alerts             avisos de "para y consulta"
 */
public record PlayerState(
		Profile profile,
		List<ZoneRisk> risk,
		String recommendedProgram,
		EnrollmentProgress enrollment,
		List<Completion> recentCompletions,
		List<Pain> pain,
		List<PainAlert> alerts) {

	public record Profile(int age, int weeklyHours, SkillLevel level, Instant createdAt) {

		static Profile from(Player player) {
			return new Profile(player.getAge(), player.getWeeklyHours(), player.getSkillLevel(),
					player.getCreatedAt());
		}
	}

	public record Completion(UUID id, String routineSlug, Instant completedAt) {

		static Completion from(RoutineCompletion completion) {
			return new Completion(completion.getId(), completion.getRoutineSlug(), completion.getCompletedAt());
		}
	}

	public record Pain(UUID id, String zone, int score, PainContext context, Instant recordedAt) {

		static Pain from(PainEntry entry) {
			return new Pain(entry.getId(), entry.getZoneCode(), entry.getScore(), entry.getContext(),
					entry.getRecordedAt());
		}
	}

}
