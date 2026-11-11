package com.prepadel.content;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class RoutineStep {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "routine_slug")
	private Routine routine;

	private int stepOrder;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "exercise_slug")
	private Exercise exercise;

	private int durationSeconds;

	/** Descanso después del ejercicio, antes del siguiente. */
	private int restSeconds;

	/** Dosis orientativa, p. ej. "8 bajadas lentas por brazo". */
	private String dosage;

	protected RoutineStep() {
	}

	public int getStepOrder() {
		return stepOrder;
	}

	public Exercise getExercise() {
		return exercise;
	}

	public int getDurationSeconds() {
		return durationSeconds;
	}

	public int getRestSeconds() {
		return restSeconds;
	}

	public String getDosage() {
		return dosage;
	}

}
