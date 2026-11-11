package com.prepadel.content;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import com.prepadel.pain.PainRules;

/**
 * Catálogo completo en una sola respuesta: la app lo guarda en el móvil
 * para que las rutinas funcionen sin cobertura.
 */
public record ContentResponse(
		List<Zone> zones,
		List<RoutineDto> routines,
		List<ProgramDto> programs,
		Review review,
		PainRule painRule) {

	public record Zone(String code, String name, String tagline) {

		static Zone from(BodyZone zone) {
			return new Zone(zone.getCode(), zone.getName(), zone.getTagline());
		}
	}

	public record Step(
			int order,
			String exerciseSlug,
			String name,
			String zone,
			String instructions,
			String voiceCue,
			String equipment,
			boolean switchSides,
			String videoUrl,
			int durationSeconds,
			int restSeconds,
			String dosage) {

		static Step from(RoutineStep step) {
			Exercise exercise = step.getExercise();
			return new Step(step.getStepOrder(), exercise.getSlug(), exercise.getName(), exercise.getZoneCode(),
					exercise.getInstructions(), exercise.getVoiceCue(), exercise.getEquipment(),
					exercise.isSwitchSides(), exercise.getVideoUrl(), step.getDurationSeconds(),
					step.getRestSeconds(), step.getDosage());
		}
	}

	public record RoutineDto(
			String slug,
			String name,
			RoutineKind kind,
			String zone,
			String summary,
			int totalSeconds,
			List<String> equipment,
			List<Step> steps) {

		static RoutineDto from(Routine routine) {
			List<Step> steps = routine.getSteps().stream().map(Step::from).toList();
			List<String> equipment = steps.stream().map(Step::equipment).filter(Objects::nonNull).distinct().toList();
			return new RoutineDto(routine.getSlug(), routine.getName(), routine.getKind(), routine.getZoneCode(),
					routine.getSummary(), routine.totalSeconds(), equipment, steps);
		}
	}

	public record Week(int week, String title, String focus, String routineSlug) {

		static Week from(ProgramWeek week) {
			return new Week(week.getWeekNumber(), week.getTitle(), week.getFocus(), week.getRoutineSlug());
		}
	}

	public record ProgramDto(
			String slug,
			String name,
			String zone,
			String summary,
			int sessionsPerWeek,
			List<Week> weeks) {

		static ProgramDto from(Program program) {
			return new ProgramDto(program.getSlug(), program.getName(), program.getZoneCode(), program.getSummary(),
					program.getSessionsPerWeek(), program.getWeeks().stream().map(Week::from).toList());
		}
	}

	public record Review(String status, String reviewerName, String reviewerCredentials, LocalDate reviewedOn) {

		static final Review DRAFT = new Review("DRAFT", null, null, null);

		static Review from(ContentReview review) {
			return new Review(review.getStatus(), review.getReviewerName(), review.getReviewerCredentials(),
					review.getReviewedOn());
		}
	}

	/** Umbrales de la regla "si el dolor supera X o dura más de Y días, consulta". */
	public record PainRule(int consultScore, int persistentScore, int persistentDays) {

		static PainRule from(PainRules rules) {
			return new PainRule(rules.consultScore(), rules.persistentScore(), rules.persistentDays());
		}
	}

}
