package com.prepadel.pain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

/** Dolor de 0 a 10 en una zona. Es un dato de salud: se borra junto con el jugador. */
@Entity
public class PainEntry {

	/** Lo genera el móvil, para que reenviar un registro pendiente no lo duplique. */
	@Id
	private UUID id;

	private UUID playerId;

	private String zoneCode;

	private int score;

	@Enumerated(EnumType.STRING)
	private PainContext context;

	private Instant recordedAt;

	protected PainEntry() {
	}

	public PainEntry(UUID id, UUID playerId, String zoneCode, int score, PainContext context, Instant recordedAt) {
		this.id = id;
		this.playerId = playerId;
		this.zoneCode = zoneCode;
		this.score = score;
		this.context = context;
		this.recordedAt = recordedAt;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPlayerId() {
		return playerId;
	}

	public String getZoneCode() {
		return zoneCode;
	}

	public int getScore() {
		return score;
	}

	public PainContext getContext() {
		return context;
	}

	public Instant getRecordedAt() {
		return recordedAt;
	}

}
