package com.prepadel.content;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

/** Programa de varias semanas para una zona, con progresión de carga semana a semana. */
@Entity
public class Program {

	@Id
	private String slug;

	private String name;

	private String zoneCode;

	private String summary;

	private int sessionsPerWeek;

	@OneToMany(mappedBy = "program")
	@OrderBy("weekNumber")
	private List<ProgramWeek> weeks = new ArrayList<>();

	protected Program() {
	}

	public String getSlug() {
		return slug;
	}

	public String getName() {
		return name;
	}

	public String getZoneCode() {
		return zoneCode;
	}

	public String getSummary() {
		return summary;
	}

	public int getSessionsPerWeek() {
		return sessionsPerWeek;
	}

	public List<ProgramWeek> getWeeks() {
		return weeks;
	}

}
