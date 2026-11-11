package com.prepadel.progress;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Una rutina terminada. Si era la sesión que tocaba del programa, cuenta para su semana. */
@Entity
public class RoutineCompletion {

	/** Lo genera el móvil, para que reenviar una rutina pendiente no la cuente dos veces. */
	@Id
	private UUID id;

	private UUID playerId;

	private String routineSlug;

	private UUID enrollmentId;

	private Integer weekNumber;

	private Instant completedAt;

	protected RoutineCompletion() {
	}

	public RoutineCompletion(UUID id, UUID playerId, String routineSlug, UUID enrollmentId, Integer weekNumber,
			Instant completedAt) {
		this.id = id;
		this.playerId = playerId;
		this.routineSlug = routineSlug;
		this.enrollmentId = enrollmentId;
		this.weekNumber = weekNumber;
		this.completedAt = completedAt;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPlayerId() {
		return playerId;
	}

	public String getRoutineSlug() {
		return routineSlug;
	}

	public UUID getEnrollmentId() {
		return enrollmentId;
	}

	public Integer getWeekNumber() {
		return weekNumber;
	}

	public Instant getCompletedAt() {
		return completedAt;
	}

}
