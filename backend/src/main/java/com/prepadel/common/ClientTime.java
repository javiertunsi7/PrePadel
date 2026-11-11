package com.prepadel.common;

import java.time.Duration;
import java.time.Instant;

/**
 * Las marcas de tiempo llegan del móvil: la app funciona sin cobertura y
 * sincroniza después, así que la hora buena es la del cliente.
 */
public final class ClientTime {

	private static final Duration MAX_CLOCK_SKEW = Duration.ofMinutes(5);
	private static final Duration MAX_OFFLINE_AGE = Duration.ofDays(30);

	private ClientTime() {
	}

	/** Hora del cliente si es creíble; si falta, es futura o demasiado antigua, la del servidor. */
	public static Instant orNow(Instant clientTime, Instant now) {
		if (clientTime == null
				|| clientTime.isAfter(now.plus(MAX_CLOCK_SKEW))
				|| clientTime.isBefore(now.minus(MAX_OFFLINE_AGE))) {
			return now;
		}
		return clientTime;
	}

}
