package com.prepadel.reminder;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** El próximo partido de un jugador y a dónde mandarle el aviso (la suscripción de su móvil). */
@Entity
public class MatchReminder {

	@Id
	private UUID playerId;

	private String endpoint;

	private String p256dh;

	private String auth;

	private Instant matchAt;

	private Instant sentAt;

	protected MatchReminder() {
	}

	public MatchReminder(UUID playerId, String endpoint, String p256dh, String auth, Instant matchAt) {
		this.playerId = playerId;
		schedule(endpoint, p256dh, auth, matchAt);
	}

	/** Partido nuevo (o cambio de hora): el aviso vuelve a estar pendiente. */
	public void schedule(String endpoint, String p256dh, String auth, Instant matchAt) {
		this.endpoint = endpoint;
		this.p256dh = p256dh;
		this.auth = auth;
		this.matchAt = matchAt;
		this.sentAt = null;
	}

	public void markSent(Instant when) {
		this.sentAt = when;
	}

	public UUID getPlayerId() {
		return playerId;
	}

	public String getEndpoint() {
		return endpoint;
	}

	public String getP256dh() {
		return p256dh;
	}

	public String getAuth() {
		return auth;
	}

	public Instant getMatchAt() {
		return matchAt;
	}

	public Instant getSentAt() {
		return sentAt;
	}

}
