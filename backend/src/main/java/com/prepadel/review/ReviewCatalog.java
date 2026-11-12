package com.prepadel.review;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.prepadel.content.Exercise;
import com.prepadel.content.Program;
import com.prepadel.content.ProgramRepository;
import com.prepadel.content.ProgramWeek;
import com.prepadel.content.Routine;
import com.prepadel.content.RoutineRepository;
import com.prepadel.content.RoutineStep;
import com.prepadel.pain.PainRules;
import com.prepadel.risk.RiskProfileService;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Todo lo que el fisioterapeuta tiene que revisar, cada pieza con su clave y la
 * huella de su contenido actual. Las ilustraciones viven en la app
 * (illustrations/catalog.ts), no aquí: cambiar un dibujo no invalida la aprobación.
 */
@Component
public class ReviewCatalog {

	public static final String PAIN_RULE = "rule:pain";
	public static final String RISK_WEIGHTS = "rule:risk";

	private final RoutineRepository routineRepository;
	private final ProgramRepository programRepository;
	private final PainRules painRules;

	public ReviewCatalog(RoutineRepository routineRepository, ProgramRepository programRepository,
			PainRules painRules) {
		this.routineRepository = routineRepository;
		this.programRepository = programRepository;
		this.painRules = painRules;
	}

	/** Clave de cada pieza → huella de su contenido, en el orden en que se revisan. */
	@Transactional(readOnly = true)
	public Map<String, String> currentHashes() {
		Map<String, String> hashes = new LinkedHashMap<>();
		hashes.put(PAIN_RULE, hash(painRules.consultScore(), painRules.persistentScore(), painRules.persistentDays()));
		hashes.put(RISK_WEIGHTS, hash(RiskProfileService.describeWeights().toArray()));

		List<Routine> routines = routineRepository.findAllWithSteps();
		Map<String, Exercise> exercises = new LinkedHashMap<>();
		routines.stream()
			.flatMap(routine -> routine.getSteps().stream())
			.map(RoutineStep::getExercise)
			.sorted(Comparator.comparing(Exercise::getSlug))
			.forEach(exercise -> exercises.putIfAbsent(exercise.getSlug(), exercise));
		exercises.values()
			.forEach(exercise -> hashes.put("exercise:" + exercise.getSlug(),
					hash(exercise.getName(), exercise.getZoneCode(), exercise.getInstructions(),
							exercise.getVoiceCue(), exercise.getEquipment(), exercise.isSwitchSides(),
							exercise.getVideoUrl())));

		routines.stream().sorted(Comparator.comparing(Routine::getSlug)).forEach(routine -> {
			List<Object> parts = new ArrayList<>(
					List.of(routine.getName(), routine.getKind(), Objects.toString(routine.getZoneCode()),
							routine.getSummary()));
			routine.getSteps()
				.stream()
				.sorted(Comparator.comparingInt(RoutineStep::getStepOrder))
				.forEach(step -> parts.addAll(Arrays.asList(step.getStepOrder(), step.getExercise().getSlug(),
						step.getDurationSeconds(), step.getRestSeconds(), step.getDosage())));
			hashes.put("routine:" + routine.getSlug(), hash(parts.toArray()));
		});

		programRepository.findAllWithWeeks()
			.stream()
			.sorted(Comparator.comparing(Program::getSlug))
			.forEach(program -> {
				List<Object> parts = new ArrayList<>(List.of(program.getName(), program.getZoneCode(),
						program.getSummary(), program.getSessionsPerWeek()));
				program.getWeeks()
					.stream()
					.sorted(Comparator.comparingInt(ProgramWeek::getWeekNumber))
					.forEach(week -> parts.addAll(List.of(week.getWeekNumber(), week.getTitle(), week.getFocus(),
							week.getRoutineSlug())));
				hashes.put("program:" + program.getSlug(), hash(parts.toArray()));
			});
		return hashes;
	}

	/** SHA-256 de las partes separadas por un carácter que no aparece en el contenido. */
	static String hash(Object... parts) {
		StringBuilder text = new StringBuilder();
		for (Object part : parts) {
			text.append(part == null ? "\u0000" : part.toString()).append('\u0001');
		}
		try {
			MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(sha256.digest(text.toString().getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException impossible) {
			throw new IllegalStateException(impossible);
		}
	}

}
