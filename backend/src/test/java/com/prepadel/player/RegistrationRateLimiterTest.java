package com.prepadel.player;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RegistrationRateLimiterTest {

	private final MutableClock clock = new MutableClock();
	private final RegistrationRateLimiter limiter = new RegistrationRateLimiter(3, clock);

	@Test
	void allowsUpToTheLimitAndThenAnswers429WithTheWait() {
		for (int i = 0; i < 3; i++) {
			assertThat(register("203.0.113.7")).isNull();
		}
		clock.advance(Duration.ofMinutes(20));

		MockHttpServletResponse blocked = register("203.0.113.7");

		assertThat(blocked).isNotNull();
		assertThat(blocked.getHeader(HttpHeaders.RETRY_AFTER)).isEqualTo("2400");
	}

	@Test
	void eachConnectionHasItsOwnCount() {
		for (int i = 0; i < 4; i++) {
			register("203.0.113.7");
		}

		assertThat(register("203.0.113.8")).isNull();
	}

	@Test
	void theCountStartsAgainAfterAnHour() {
		for (int i = 0; i < 4; i++) {
			register("203.0.113.7");
		}
		clock.advance(RegistrationRateLimiter.WINDOW);

		assertThat(register("203.0.113.7")).isNull();
	}

	@Test
	void ipv6AddressesOfTheSameHomeBlockShareTheCount() {
		for (int i = 0; i < 3; i++) {
			register("2001:db8:1:2::" + (i + 1));
		}

		assertThat(register("2001:db8:1:2:ffff::9")).isNotNull();
		assertThat(register("2001:db8:1:3::1")).isNull();
	}

	@Test
	void onlyRegistrationsCount() {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/players");
		for (int i = 0; i < 10; i++) {
			assertThat(limiter.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
		}
	}

	/** Devuelve null si el registro pasa y la respuesta (con Retry-After) si se rechaza. */
	private MockHttpServletResponse register(String ip) {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/players");
		request.setRemoteAddr(ip);
		MockHttpServletResponse response = new MockHttpServletResponse();
		try {
			limiter.preHandle(request, response, new Object());
			return null;
		} catch (ResponseStatusException rejected) {
			assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
			return response;
		}
	}

	private static final class MutableClock extends Clock {

		private Instant now = Instant.parse("2026-11-12T10:00:00Z");

		void advance(Duration duration) {
			now = now.plus(duration);
		}

		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public ZoneId getZone() {
			return ZoneId.of("UTC");
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

	}

}
