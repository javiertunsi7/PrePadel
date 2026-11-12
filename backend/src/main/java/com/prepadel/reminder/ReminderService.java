package com.prepadel.reminder;

import java.time.Clock;
import java.time.Duration;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Aviso de calentamiento 30 minutos antes del partido, aunque la app esté cerrada. */
@Service
public class ReminderService {

	static final Duration LEAD = Duration.ofMinutes(30);

	/** Pasado este tiempo desde el partido, la suscripción guardada ya no hace falta y se borra. */
	private static final Duration KEEP_AFTER_MATCH = Duration.ofHours(24);

	/** Nadie marca un partido a más de una semana vista: la app solo pregunta la hora de hoy o mañana. */
	private static final Duration MAX_AHEAD = Duration.ofDays(7);

	private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Madrid");

	private final MatchReminderRepository repository;
	private final PushGateway gateway;
	private final Clock clock;

	public ReminderService(MatchReminderRepository repository, PushGateway gateway, Clock clock) {
		this.repository = repository;
		this.gateway = gateway;
		this.clock = clock;
	}

	/** Guarda el partido del jugador, o cancela el aviso si no trae hora o suscripción. */
	@Transactional
	public void set(UUID playerId, ReminderRequest request) {
		ReminderRequest.Subscription subscription = request.subscription();
		if (request.matchAt() == null || subscription == null) {
			repository.deleteById(playerId);
			return;
		}
		if (!WebPushGateway.isPushService(subscription.endpoint())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suscripción de notificaciones no admitida");
		}
		if (request.matchAt().isAfter(clock.instant().plus(MAX_AHEAD))) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El partido queda demasiado lejos");
		}
		boolean weekly = Boolean.TRUE.equals(request.weekly());
		ZoneId zone = zoneOf(request.timeZone());
		repository.findById(playerId)
			.ifPresentOrElse(
					existing -> existing.schedule(subscription.endpoint(), subscription.p256dh(), subscription.auth(),
							request.matchAt(), weekly, zone),
					() -> repository.save(new MatchReminder(playerId, subscription.endpoint(), subscription.p256dh(),
							subscription.auth(), request.matchAt(), weekly, zone)));
	}

	@Transactional
	@Scheduled(fixedDelayString = "${prepadel.push.check-every:PT30S}", initialDelayString = "PT30S")
	public void sendDueOnSchedule() {
		if (gateway.enabled()) {
			sendDue();
		}
	}

	/** Envía los avisos de los partidos que empiezan en media hora o menos. Devuelve cuántos ha entregado. */
	@Transactional
	public int sendDue() {
		Instant now = clock.instant();
		repository.findByWeeklyTrueAndMatchAtLessThanEqual(now).forEach(reminder -> reminder.rollToNextWeekAfter(now));
		repository.deleteByWeeklyFalseAndMatchAtLessThan(now.minus(KEEP_AFTER_MATCH));

		List<MatchReminder> due = repository.findBySentAtIsNullAndMatchAtGreaterThanAndMatchAtLessThanEqual(now,
				now.plus(LEAD));
		int delivered = 0;
		for (MatchReminder reminder : due) {
			switch (gateway.send(reminder, payload(reminder.getMatchAt(), now))) {
				case DELIVERED -> {
					reminder.markSent(now);
					delivered++;
				}
				case GONE -> repository.delete(reminder);
				// Un fallo no se reintenta: un aviso que llega tarde o repetido molesta más que ayuda.
				case FAILED -> reminder.markSent(now);
			}
		}
		return delivered;
	}

	private static ZoneId zoneOf(String timeZone) {
		if (timeZone == null || timeZone.isBlank()) {
			return DEFAULT_ZONE;
		}
		try {
			return ZoneId.of(timeZone);
		} catch (DateTimeException unknown) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zona horaria desconocida: " + timeZone);
		}
	}

	/** Lo que el móvil enseña. Sin datos del jugador: solo que toca calentar. */
	static String payload(Instant matchAt, Instant now) {
		long minutes = Math.max(1, Math.round(Duration.between(now, matchAt).toSeconds() / 60.0));
		String when = minutes == 1 ? "1 minuto" : minutes + " minutos";
		return """
				{"title":"Toca calentar","body":"Tu partido empieza en %s. Diez minutos de calentamiento y a la pista.","url":"/"}"""
			.formatted(when);
	}

}
