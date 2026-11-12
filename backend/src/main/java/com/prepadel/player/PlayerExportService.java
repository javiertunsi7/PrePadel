package com.prepadel.player;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Copia de todo lo que el servidor guarda de un jugador, para que se la lleve
 * (derecho de acceso y portabilidad, RGPD arts. 15 y 20). No incluye la huella
 * del token ni identificadores internos, que no le dicen nada.
 */
@Service
public class PlayerExportService {

	public record Export(Instant exportedAt, Profile profile, List<Pain> pain, List<Enrollment> programs,
			List<Completion> completedRoutines, List<Abandonment> abandonedRoutines, Match nextMatch) {
	}

	public record Profile(int age, int weeklyHours, String level, String consentVersion, Instant consentAt,
			Instant createdAt) {
	}

	public record Pain(String zone, int score, String context, Instant recordedAt) {
	}

	public record Enrollment(String program, Instant startedAt, boolean active) {
	}

	public record Completion(String routine, Integer programWeek, Instant completedAt) {
	}

	public record Abandonment(String routine, String exercise, Instant abandonedAt) {
	}

	/** El aviso del partido. La dirección de notificaciones del móvil no se incluye: es técnica. */
	public record Match(Instant matchAt, boolean weekly, String timeZone) {
	}

	private final JdbcTemplate jdbc;
	private final Clock clock;

	public PlayerExportService(JdbcTemplate jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public Export export(UUID playerId) {
		Profile profile = jdbc.queryForObject("""
				select age, weekly_hours, skill_level, consent_version, consent_at, created_at
				from player where id = ?
				""", (row, index) -> new Profile(row.getInt(1), row.getInt(2), row.getString(3), row.getString(4),
				instant(row, 5), instant(row, 6)), playerId);
		List<Pain> pain = jdbc.query("""
				select zone_code, score, context, recorded_at from pain_entry
				where player_id = ? order by recorded_at
				""", (row, index) -> new Pain(row.getString(1), row.getInt(2), row.getString(3), instant(row, 4)),
				playerId);
		List<Enrollment> programs = jdbc.query("""
				select program_slug, started_at, active from program_enrollment
				where player_id = ? order by started_at
				""", (row, index) -> new Enrollment(row.getString(1), instant(row, 2), row.getBoolean(3)), playerId);
		List<Completion> completions = jdbc.query("""
				select routine_slug, week_number, completed_at from routine_completion
				where player_id = ? order by completed_at
				""", (row, index) -> new Completion(row.getString(1), (Integer) row.getObject(2, Integer.class),
				instant(row, 3)), playerId);
		List<Abandonment> abandonments = jdbc.query("""
				select routine_slug, exercise_slug, abandoned_at from routine_abandonment
				where player_id = ? order by abandoned_at
				""", (row, index) -> new Abandonment(row.getString(1), row.getString(2), instant(row, 3)), playerId);
		Match match = jdbc.query("select match_at, weekly, time_zone from match_reminder where player_id = ?",
				(row, index) -> new Match(instant(row, 1), row.getBoolean(2), row.getString(3)), playerId)
			.stream()
			.findFirst()
			.orElse(null);
		return new Export(clock.instant(), profile, pain, programs, completions, abandonments, match);
	}

	/** Igual en H2 y en PostgreSQL: el controlador JDBC entrega la fecha con su zona. */
	private static Instant instant(ResultSet row, int column) throws SQLException {
		OffsetDateTime value = row.getObject(column, OffsetDateTime.class);
		return value == null ? null : value.toInstant();
	}

}
