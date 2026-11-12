package com.prepadel.reminder;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
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

	/** Se repite cada semana, el mismo día y a la misma hora de reloj en {@link #timeZone}. */
	private boolean weekly;

	private String timeZone;

	protected MatchReminder() {
	}

	public MatchReminder(UUID playerId, String endpoint, String p256dh, String auth, Instant matchAt, boolean weekly,
			ZoneId zone) {
		this.playerId = playerId;
		schedule(endpoint, p256dh, auth, matchAt, weekly, zone);
	}

	/** Partido nuevo (o cambio de hora): el aviso vuelve a estar pendiente. */
	public void schedule(String endpoint, String p256dh, String auth, Instant matchAt, boolean weekly, ZoneId zone) {
		this.endpoint = endpoint;
		this.p256dh = p256dh;
		this.auth = auth;
		this.matchAt = matchAt;
		this.weekly = weekly;
		this.timeZone = zone.getId();
		this.sentAt = null;
	}

	/** Partido semanal ya empezado: pasa al de la semana siguiente que aún no haya llegado. */
	public void rollToNextWeekAfter(Instant now) {
		ZonedDateTime next = matchAt.atZone(ZoneId.of(timeZone));
		while (!next.toInstant().isAfter(now)) {
			next = next.plusWeeks(1);
		}
		this.matchAt = next.toInstant();
		this.sentAt = null;
	}

	public boolean isWeekly() {
		return weekly;
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
