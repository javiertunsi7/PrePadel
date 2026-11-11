package com.prepadel.content;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProgramRepository extends JpaRepository<Program, String> {

	@Query("select distinct p from Program p left join fetch p.weeks")
	List<Program> findAllWithWeeks();

	@Query("select p from Program p left join fetch p.weeks where p.slug = :slug")
	Optional<Program> findWithWeeks(@Param("slug") String slug);

	Optional<Program> findFirstByZoneCodeOrderBySlug(String zoneCode);

}
