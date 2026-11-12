package com.prepadel.player;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Tope de jugadores nuevos por conexión y hora. Crear un jugador no pide
 * token, así que sin tope cualquiera podría llenar la base de datos.
 *
 * La cuenta vive en memoria: se pone a cero al reiniciar y vale mientras haya
 * un solo servidor. La dirección IP no se guarda en la base de datos.
 */
@Component
public class RegistrationRateLimiter implements HandlerInterceptor {

	static final Duration WINDOW = Duration.ofHours(1);

	/** A partir de aquí se tiran las cuentas caducadas para que el mapa no crezca sin fin. */
	private static final int CLEANUP_SIZE = 10_000;

	private record Window(long startMillis, int count) {
	}

	private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
	private final int limit;
	private final Clock clock;

	@Autowired
	public RegistrationRateLimiter(@Value("${prepadel.rate-limit.registrations-per-hour}") int limit) {
		this(limit, Clock.systemUTC());
	}

	RegistrationRateLimiter(int limit, Clock clock) {
		this.limit = limit;
		this.clock = clock;
	}

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		if (!"POST".equals(request.getMethod())) {
			return true;
		}
		long now = clock.millis();
		if (windows.size() > CLEANUP_SIZE) {
			windows.values().removeIf(window -> expired(window, now));
		}
		Window window = windows.compute(clientKey(request.getRemoteAddr()),
				(key, current) -> current == null || expired(current, now) ? new Window(now, 1)
						: new Window(current.startMillis(), current.count() + 1));
		if (window.count() > limit) {
			long retryAfterSeconds = Math.max(1, (window.startMillis() + WINDOW.toMillis() - now + 999) / 1000);
			response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(retryAfterSeconds));
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
					"Demasiados registros desde esta conexión. Prueba de nuevo más tarde.");
		}
		return true;
	}

	private static boolean expired(Window window, long now) {
		return now - window.startMillis() >= WINDOW.toMillis();
	}

	/**
	 * En IPv6 cada casa recibe un bloque entero de direcciones (los primeros 64 bits)
	 * y puede cambiar de una a otra a voluntad: se cuenta por bloque, no por dirección.
	 */
	static String clientKey(String remoteAddr) {
		try {
			if (InetAddress.ofLiteral(remoteAddr) instanceof Inet6Address v6) {
				return HexFormat.of().formatHex(v6.getAddress(), 0, 8);
			}
		} catch (IllegalArgumentException | NullPointerException notAnAddress) {
			// se cuenta tal cual llega
		}
		return String.valueOf(remoteAddr);
	}

}
