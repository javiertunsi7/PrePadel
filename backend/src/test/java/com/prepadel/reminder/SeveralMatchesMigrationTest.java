package com.prepadel.reminder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La migración V7 (varios partidos por jugador) conserva el aviso que ya estuviera
 * guardado, con el id que la app le da al actualizarse. Se prueba en un esquema
 * aparte de la misma base de datos que el resto de tests: H2, y en CI también PostgreSQL.
 */
@SpringBootTest
@ActiveProfiles("test")
class SeveralMatchesMigrationTest {

	private static final String SCHEMA = "\"migracion_v7\"";

	private static final String ENDPOINT = "https://fcm.googleapis.com/fcm/send/movil";

	@Autowired
	private DataSource dataSource;

	private JdbcTemplate jdbc;

	@BeforeEach
	void setUp() {
		jdbc = new JdbcTemplate(dataSource);
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@AfterEach
	void tearDown() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void theMatchSavedBeforeV7IsKeptAndThePlayerCanAddMore() {
		migrateTo("6");
		UUID player = UUID.randomUUID();
		OffsetDateTime now = OffsetDateTime.parse("2026-11-14T10:00:00Z");
		jdbc.update("""
				insert into %s.player (id, token_hash, age, weekly_hours, skill_level, consent_version, consent_at,
				                       created_at)
				values (?, 'huella', 47, 4, 'INTERMEDIATE', '2026-11', ?, ?)
				""".formatted(SCHEMA), player, now, now);
		jdbc.update("""
				insert into %s.match_reminder (player_id, endpoint, p256dh, auth, match_at, weekly, time_zone)
				values (?, ?, 'clave', 'secreto', ?, true, 'Europe/Madrid')
				""".formatted(SCHEMA), player, ENDPOINT, OffsetDateTime.parse("2026-11-17T18:00:00Z"));

		migrateTo("latest");

		assertThat(saved()).containsExactly(ReminderService.LEGACY_MATCH + " " + player + " " + ENDPOINT
				+ " clave secreto 2026-11-17T18:00:00Z true Europe/Madrid");

		UUID thursday = UUID.randomUUID();
		jdbc.update("""
				insert into %s.match_reminder (player_id, id, endpoint, p256dh, auth, match_at, weekly, time_zone)
				values (?, ?, ?, 'clave', 'secreto', ?, true, 'Europe/Madrid')
				""".formatted(SCHEMA), player, thursday, ENDPOINT, OffsetDateTime.parse("2026-11-19T19:00:00Z"));
		assertThat(saved()).hasSize(2);
	}

	private void migrateTo(String version) {
		Flyway.configure().dataSource(dataSource).schemas(SCHEMA.replace("\"", "")).target(version).load().migrate();
	}

	private List<String> saved() {
		return jdbc.query("""
				select id, player_id, endpoint, p256dh, auth, match_at, weekly, time_zone
				from %s.match_reminder order by match_at
				""".formatted(SCHEMA),
				(row, index) -> String.join(" ", String.valueOf(row.getObject(1, UUID.class)),
						String.valueOf(row.getObject(2, UUID.class)), row.getString(3), row.getString(4),
						row.getString(5), row.getObject(6, OffsetDateTime.class).toInstant().toString(),
						String.valueOf(row.getBoolean(7)), row.getString(8)));
	}

}
