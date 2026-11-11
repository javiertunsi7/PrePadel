package com.prepadel.progress;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutineCompletionRepository extends JpaRepository<RoutineCompletion, UUID> {

	List<RoutineCompletion> findByEnrollmentId(UUID enrollmentId);

	List<RoutineCompletion> findByPlayerIdAndCompletedAtAfterOrderByCompletedAtDesc(UUID playerId, Instant after);

}
