package com.prepadel.stats;

import java.time.Instant;
import java.util.List;

/**
 * Cifras agregadas de uso: nunca datos de un jugador concreto ni de dolor.
 *
 * @param cohort           jugadores que se dieron de alta hace 14 días o más
 * @param retained         de ellos, los que terminaron alguna rutina en su segunda semana (días 7 a 14)
 * @param retentionPercent null si todavía no hay nadie con 14 días de antigüedad
 * @param abandonedExercises ejercicios en los que más se sale de la rutina, de más a menos
 * @param clubs            las mismas cuentas por club: primero los de prepadel.clubs (también sin jugadores),
 *                         después los que ya no están configurados y, al final, los que llegaron sin enlace
 */
public record RetentionStats(Instant generatedAt, long players, long newPlayers7d, long active7d, long active30d,
		long cohort, long retained, Integer retentionPercent, long completions30d, long abandonments30d,
		List<AbandonedExercise> abandonedExercises, List<ClubRetention> clubs) {

	public record AbandonedExercise(String routine, String exercise, long times) {
	}

	/** @param club null para los jugadores que llegaron sin enlace de club */
	public record ClubRetention(String club, long players, long active7d, long cohort, long retained,
			Integer retentionPercent) {
	}

}
