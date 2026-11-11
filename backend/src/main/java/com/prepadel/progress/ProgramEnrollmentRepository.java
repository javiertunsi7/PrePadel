package com.prepadel.progress;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramEnrollmentRepository extends JpaRepository<ProgramEnrollment, UUID> {

	Optional<ProgramEnrollment> findByPlayerIdAndActiveTrue(UUID playerId);

}
