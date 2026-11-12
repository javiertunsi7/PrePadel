package com.prepadel.reminder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchReminderRepository extends JpaRepository<MatchReminder, UUID> {

	/** Avisos sin enviar de partidos que empiezan dentro de ese tramo. */
	List<MatchReminder> findBySentAtIsNullAndMatchAtGreaterThanAndMatchAtLessThanEqual(Instant after, Instant until);

	long deleteByMatchAtLessThan(Instant before);

}
