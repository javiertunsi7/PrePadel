package com.prepadel.player;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

/**
 * Jugador anónimo: no guardamos nombre ni email, solo las respuestas del
 * cuestionario y el hash del token con el que su móvil se identifica.
 */
@Entity
public class Player {

	@Id
	private UUID id;

	private String tokenHash;

	private int age;

	private int weeklyHours;

	@Enumerated(EnumType.STRING)
	private SkillLevel skillLevel;

	/** Versión del texto de consentimiento de datos de salud que aceptó. */
	private String consentVersion;

	private Instant consentAt;

	private Instant createdAt;

	protected Player() {
	}

	public Player(UUID id, String tokenHash, int age, int weeklyHours, SkillLevel skillLevel, String consentVersion,
			Instant now) {
		this.id = id;
		this.tokenHash = tokenHash;
		this.age = age;
		this.weeklyHours = weeklyHours;
		this.skillLevel = skillLevel;
		this.consentVersion = consentVersion;
		this.consentAt = now;
		this.createdAt = now;
	}

	public UUID getId() {
		return id;
	}

	public int getAge() {
		return age;
	}

	public int getWeeklyHours() {
		return weeklyHours;
	}

	public SkillLevel getSkillLevel() {
		return skillLevel;
	}

	public String getConsentVersion() {
		return consentVersion;
	}

	public Instant getConsentAt() {
		return consentAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
