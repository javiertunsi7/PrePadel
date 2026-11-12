package com.prepadel.reminder;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Hora del partido y suscripción de notificaciones del móvil. Sin hora o sin
 * suscripción, se cancela el aviso que hubiera.
 *
 * @param subscription lo que devuelve el navegador al suscribirse (PushSubscription)
 */
public record ReminderRequest(Instant matchAt, @Valid Subscription subscription) {

	public record Subscription(@NotBlank @Size(max = 1000) String endpoint, @NotBlank @Size(max = 120) String p256dh,
			@NotBlank @Size(max = 40) String auth) {
	}

}
