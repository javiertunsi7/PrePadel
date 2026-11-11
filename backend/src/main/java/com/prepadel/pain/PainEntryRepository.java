package com.prepadel.pain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PainEntryRepository extends JpaRepository<PainEntry, UUID> {

	List<PainEntry> findByPlayerIdAndRecordedAtAfterOrderByRecordedAtDesc(UUID playerId, Instant after);

	long countByPlayerId(UUID playerId);

}
