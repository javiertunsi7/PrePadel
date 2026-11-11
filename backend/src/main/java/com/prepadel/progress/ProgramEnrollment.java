package com.prepadel.progress;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Un jugador siguiendo un programa. Solo puede tener uno activo a la vez. */
@Entity
public class ProgramEnrollment {

	@Id
	private UUID id;

	private UUID playerId;

	private String programSlug;

	private Instant startedAt;

	private boolean active;

	protected ProgramEnrollment() {
	}

	public ProgramEnrollment(UUID id, UUID playerId, String programSlug, Instant startedAt) {
		this.id = id;
		this.playerId = playerId;
		this.programSlug = programSlug;
		this.startedAt = startedAt;
		this.active = true;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPlayerId() {
		return playerId;
	}

	public String getProgramSlug() {
		return programSlug;
	}

	public Instant getStartedAt() {
		return startedAt;
	}

	public boolean isActive() {
		return active;
	}

	public void deactivate() {
		this.active = false;
	}

}
