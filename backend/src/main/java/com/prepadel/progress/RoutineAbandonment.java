package com.prepadel.progress;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Una rutina que el jugador dejó a medias, y el ejercicio en el que estaba. */
@Entity
public class RoutineAbandonment {

	/** Lo genera el móvil, para que reenviarlo no lo cuente dos veces. */
	@Id
	private UUID id;

	private UUID playerId;

	private String routineSlug;

	private String exerciseSlug;

	private Instant abandonedAt;

	protected RoutineAbandonment() {
	}

	public RoutineAbandonment(UUID id, UUID playerId, String routineSlug, String exerciseSlug, Instant abandonedAt) {
		this.id = id;
		this.playerId = playerId;
		this.routineSlug = routineSlug;
		this.exerciseSlug = exerciseSlug;
		this.abandonedAt = abandonedAt;
	}

	public UUID getId() {
		return id;
	}

}
