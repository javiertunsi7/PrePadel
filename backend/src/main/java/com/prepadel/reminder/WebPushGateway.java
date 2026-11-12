package com.prepadel.reminder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Envío real por Web Push. Solo habla con los servicios de notificaciones de
 * los navegadores: la dirección la manda el móvil, así que sin esa lista
 * cualquiera podría usar el servidor para llamar a donde quisiera.
 */
@Component
public class WebPushGateway implements PushGateway {

	private static final Logger log = LoggerFactory.getLogger(WebPushGateway.class);

	/** Google (Chrome, Android), Mozilla, Apple y Microsoft. */
	private static final List<String> PUSH_SERVICES = List.of("fcm.googleapis.com", ".push.services.mozilla.com",
			".push.apple.com", ".notify.windows.com");

	/** Se crea al enviar el primer aviso: un servidor sin claves configuradas no lo necesita. */
	private volatile HttpClient http;

	private final String publicKey;
	private final String privateKey;
	private final String subject;
	private final Clock clock;

	public WebPushGateway(@Value("${prepadel.push.public-key:}") String publicKey,
			@Value("${prepadel.push.private-key:}") String privateKey,
			@Value("${prepadel.push.subject:}") String subject, Clock clock) {
		this.publicKey = publicKey.trim();
		this.privateKey = privateKey.trim();
		this.subject = subject.trim();
		this.clock = clock;
	}

	@Override
	public boolean enabled() {
		return !publicKey.isEmpty() && !privateKey.isEmpty() && !subject.isEmpty();
	}

	@Override
	public String publicKey() {
		return enabled() ? publicKey : null;
	}

	private HttpClient client() {
		HttpClient client = http;
		if (client == null) {
			synchronized (this) {
				if (http == null) {
					http = HttpClient.newBuilder()
						.connectTimeout(Duration.ofSeconds(10))
						.followRedirects(HttpClient.Redirect.NEVER)
						.build();
				}
				client = http;
			}
		}
		return client;
	}

	/** Solo https y solo hacia un servicio de notificaciones conocido. */
	static boolean isPushService(String endpoint) {
		try {
			URI uri = URI.create(endpoint);
			String host = uri.getHost();
			if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || uri.getUserInfo() != null
					|| (uri.getPort() != -1 && uri.getPort() != 443)) {
				return false;
			}
			String lower = host.toLowerCase(Locale.ROOT);
			return PUSH_SERVICES.stream()
				.anyMatch(service -> service.startsWith(".") ? lower.endsWith(service) : lower.equals(service));
		} catch (IllegalArgumentException malformed) {
			return false;
		}
	}

	@Override
	public Result send(MatchReminder reminder, String payloadJson) {
		if (!enabled() || !isPushService(reminder.getEndpoint())) {
			return Result.FAILED;
		}
		try {
			URI endpoint = URI.create(reminder.getEndpoint());
			byte[] body = WebPush.encrypt(payloadJson.getBytes(StandardCharsets.UTF_8), reminder.getP256dh(),
					reminder.getAuth());
			HttpRequest request = HttpRequest.newBuilder(endpoint)
				.timeout(Duration.ofSeconds(15))
				.header("Authorization",
						WebPush.vapidAuthorization(endpoint, subject, publicKey, privateKey, clock.instant()))
				.header("Content-Encoding", "aes128gcm")
				.header("Content-Type", "application/octet-stream")
				.header("TTL", "1800") // pasada media hora el aviso ya no sirve
				.header("Urgency", "high")
				.POST(HttpRequest.BodyPublishers.ofByteArray(body))
				.build();
			int status = client().send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
			if (status >= 200 && status < 300) {
				log.info("Aviso del partido entregado a {}", endpoint.getHost());
				return Result.DELIVERED;
			}
			if (status == 404 || status == 410) {
				log.info("Suscripción caducada en {} ({}): se borra", endpoint.getHost(), status);
				return Result.GONE;
			}
			log.warn("El servicio de notificaciones {} respondió {}", endpoint.getHost(), status);
			return Result.FAILED;
		} catch (GeneralSecurityException | IOException | RuntimeException failure) {
			log.warn("No se pudo enviar el aviso del partido: {}", failure.toString());
			return Result.FAILED;
		} catch (InterruptedException interrupted) {
			Thread.currentThread().interrupt();
			return Result.FAILED;
		}
	}

}
