package com.prepadel.content;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

/** Una semana del programa: la rutina que toca repetir esa semana. */
@Entity
public class ProgramWeek {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "program_slug")
	private Program program;

	private int weekNumber;

	private String title;

	private String focus;

	private String routineSlug;

	protected ProgramWeek() {
	}

	public int getWeekNumber() {
		return weekNumber;
	}

	public String getTitle() {
		return title;
	}

	public String getFocus() {
		return focus;
	}

	public String getRoutineSlug() {
		return routineSlug;
	}

}
