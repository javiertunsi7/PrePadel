package com.prepadel.content;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BodyZoneRepository extends JpaRepository<BodyZone, String> {

	List<BodyZone> findAllByOrderBySortOrder();

}
