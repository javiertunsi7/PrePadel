package com.prepadel.reminder;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Un partido con su aviso 30 minutos antes, aunque la app esté cerrada.
 *
 * @param id           lo genera el móvil: reenviar el mismo partido (o cambiarle la hora) no lo duplica
 * @param subscription lo que devuelve el navegador al suscribirse (PushSubscription)
 * @param weekly       se repite cada semana el mismo día y a la misma hora
 * @param timeZone     zona horaria del móvil (Europe/Madrid si no viene)
 */
public record MatchRequest(@NotNull UUID id, @NotNull Instant matchAt,
		@NotNull @Valid ReminderRequest.Subscription subscription, Boolean weekly, @Size(max = 60) String timeZone) {
}
