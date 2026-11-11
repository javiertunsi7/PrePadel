package com.prepadel.content;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoutineRepository extends JpaRepository<Routine, String> {

	@Query("select distinct r from Routine r left join fetch r.steps s left join fetch s.exercise")
	List<Routine> findAllWithSteps();

}
