package com.prepadel.pain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PainEntryRepository extends JpaRepository<PainEntry, UUID> {

	List<PainEntry> findByPlayerIdAndRecordedAtAfterOrderByRecordedAtDesc(UUID playerId, Instant after);

	/** Último registro de la zona hasta ese momento (incluido). */
	Optional<PainEntry> findFirstByPlayerIdAndZoneCodeAndRecordedAtLessThanEqualOrderByRecordedAtDesc(UUID playerId,
			String zoneCode, Instant until);

	/** Último registro de la zona posterior a ese momento. */
	Optional<PainEntry> findFirstByPlayerIdAndZoneCodeAndRecordedAtAfterOrderByRecordedAtDesc(UUID playerId,
			String zoneCode, Instant after);

	long countByPlayerId(UUID playerId);

}
