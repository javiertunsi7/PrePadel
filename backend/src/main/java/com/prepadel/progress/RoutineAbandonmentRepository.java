package com.prepadel.progress;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoutineAbandonmentRepository extends JpaRepository<RoutineAbandonment, UUID> {

	/** Mayor que cero si ese ejercicio forma parte de esa rutina. */
	@Query(value = "select count(*) from routine_step where routine_slug = :routine and exercise_slug = :exercise",
			nativeQuery = true)
	long countSteps(@Param("routine") String routineSlug, @Param("exercise") String exerciseSlug);

}
