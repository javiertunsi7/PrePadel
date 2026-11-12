package com.prepadel.stats;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import com.prepadel.stats.RetentionStats.AbandonedExercise;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Calcula las cifras del panel con los datos que la app ya guarda. Nada sale a servicios externos. */
@Service
public class RetentionStatsService {

	private static final int TOP_EXERCISES = 10;

	private final JdbcTemplate jdbc;
	private final Clock clock;

	public RetentionStatsService(JdbcTemplate jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public RetentionStats stats() {
		Instant now = clock.instant();
		OffsetDateTime weekAgo = at(now.minus(Duration.ofDays(7)));
		OffsetDateTime twoWeeksAgo = at(now.minus(Duration.ofDays(14)));
		OffsetDateTime monthAgo = at(now.minus(Duration.ofDays(30)));

		long cohort = count("select count(*) from player where created_at <= ?", twoWeeksAgo);
		long retained = count("""
				select count(*) from player p
				where p.created_at <= ?
				  and exists (select 1 from routine_completion c
				              where c.player_id = p.id
				                and c.completed_at >= p.created_at + interval '7' day
				                and c.completed_at < p.created_at + interval '14' day)
				""", twoWeeksAgo);

		List<AbandonedExercise> abandoned = jdbc.query("""
				select r.name, e.name, count(*) as times
				from routine_abandonment a
				join routine r on r.slug = a.routine_slug
				join exercise e on e.slug = a.exercise_slug
				group by r.name, e.name
				order by times desc, r.name, e.name
				fetch first %d rows only
				""".formatted(TOP_EXERCISES),
				(row, index) -> new AbandonedExercise(row.getString(1), row.getString(2), row.getLong(3)));

		return new RetentionStats(now,
				count("select count(*) from player"),
				count("select count(*) from player where created_at >= ?", weekAgo),
				count("select count(distinct player_id) from routine_completion where completed_at >= ?", weekAgo),
				count("select count(distinct player_id) from routine_completion where completed_at >= ?", monthAgo),
				cohort, retained, cohort == 0 ? null : (int) Math.round(100.0 * retained / cohort),
				count("select count(*) from routine_completion where completed_at >= ?", monthAgo),
				count("select count(*) from routine_abandonment where abandoned_at >= ?", monthAgo),
				abandoned);
	}

	private long count(String sql, Object... args) {
		Long value = jdbc.queryForObject(sql, Long.class, args);
		return value == null ? 0 : value;
	}

	private static OffsetDateTime at(Instant instant) {
		return instant.atOffset(ZoneOffset.UTC);
	}

}
