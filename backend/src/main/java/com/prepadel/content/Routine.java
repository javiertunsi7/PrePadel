package com.prepadel.content;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

@Entity
public class Routine {

	@Id
	private String slug;

	private String name;

	@Enumerated(EnumType.STRING)
	private RoutineKind kind;

	private String zoneCode;

	private String summary;

	@OneToMany(mappedBy = "routine")
	@OrderBy("stepOrder")
	private List<RoutineStep> steps = new ArrayList<>();

	protected Routine() {
	}

	public String getSlug() {
		return slug;
	}

	public String getName() {
		return name;
	}

	public RoutineKind getKind() {
		return kind;
	}

	public String getZoneCode() {
		return zoneCode;
	}

	public String getSummary() {
		return summary;
	}

	public List<RoutineStep> getSteps() {
		return steps;
	}

	/** Duración total: trabajo más descansos. */
	public int totalSeconds() {
		return steps.stream().mapToInt(step -> step.getDurationSeconds() + step.getRestSeconds()).sum();
	}

}
