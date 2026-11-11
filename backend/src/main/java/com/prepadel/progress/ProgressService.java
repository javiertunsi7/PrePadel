package com.prepadel.progress;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import com.prepadel.common.ClientTime;
import com.prepadel.content.Program;
import com.prepadel.content.ProgramRepository;
import com.prepadel.content.ProgramWeek;
import com.prepadel.content.RoutineRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Progreso en los programas. Se avanza por sesiones hechas, no por calendario:
 * la semana 2 se abre al completar las sesiones de la semana 1, tarde lo que tarde.
 */
@Service
public class ProgressService {

	/** Por dónde va el jugador en su programa activo. */
	public record EnrollmentProgress(
			String programSlug,
			int currentWeek,
			int totalWeeks,
			int sessionsDoneThisWeek,
			int sessionsPerWeek,
			String routineSlug,
			boolean completed,
			Instant startedAt) {
	}

	private final ProgramEnrollmentRepository enrollmentRepository;
	private final RoutineCompletionRepository completionRepository;
	private final ProgramRepository programRepository;
	private final RoutineRepository routineRepository;
	private final Clock clock;

	public ProgressService(ProgramEnrollmentRepository enrollmentRepository,
			RoutineCompletionRepository completionRepository, ProgramRepository programRepository,
			RoutineRepository routineRepository, Clock clock) {
		this.enrollmentRepository = enrollmentRepository;
		this.completionRepository = completionRepository;
		this.programRepository = programRepository;
		this.routineRepository = routineRepository;
		this.clock = clock;
	}

	/** Empieza un programa. Sustituye al que hubiera activo; repetir el mismo a medias no lo reinicia. */
	@Transactional
	public void enroll(UUID playerId, String programSlug) {
		if (!programRepository.existsById(programSlug)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Programa desconocido: " + programSlug);
		}
		Optional<ProgramEnrollment> current = enrollmentRepository.findByPlayerIdAndActiveTrue(playerId);
		if (current.isPresent()) {
			ProgramEnrollment enrollment = current.get();
			if (enrollment.getProgramSlug().equals(programSlug) && !progressOf(enrollment).completed()) {
				return;
			}
			enrollment.deactivate();
		}
		enrollmentRepository.save(new ProgramEnrollment(UUID.randomUUID(), playerId, programSlug, clock.instant()));
	}

	@Transactional
	public void complete(UUID playerId, CompletionRequest request) {
		if (completionRepository.existsById(request.id())) {
			return; // reintento de una rutina que ya llegó
		}
		if (!routineRepository.existsById(request.routineSlug())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rutina desconocida: " + request.routineSlug());
		}
		UUID enrollmentId = null;
		Integer week = null;
		Optional<ProgramEnrollment> active = enrollmentRepository.findByPlayerIdAndActiveTrue(playerId);
		if (active.isPresent()) {
			EnrollmentProgress progress = progressOf(active.get());
			if (!progress.completed() && progress.routineSlug().equals(request.routineSlug())) {
				enrollmentId = active.get().getId();
				week = progress.currentWeek();
			}
		}
		completionRepository.save(new RoutineCompletion(request.id(), playerId, request.routineSlug(), enrollmentId,
				week, ClientTime.orNow(request.completedAt(), clock.instant())));
	}

	@Transactional(readOnly = true)
	public Optional<EnrollmentProgress> activeProgress(UUID playerId) {
		return enrollmentRepository.findByPlayerIdAndActiveTrue(playerId).map(this::progressOf);
	}

	private EnrollmentProgress progressOf(ProgramEnrollment enrollment) {
		Program program = programRepository.findWithWeeks(enrollment.getProgramSlug()).orElseThrow();
		Map<Integer, Long> sessionsPerWeek = completionRepository.findByEnrollmentId(enrollment.getId()).stream()
				.collect(Collectors.groupingBy(RoutineCompletion::getWeekNumber, Collectors.counting()));

		List<ProgramWeek> weeks = program.getWeeks();
		for (ProgramWeek week : weeks) {
			int done = sessionsPerWeek.getOrDefault(week.getWeekNumber(), 0L).intValue();
			if (done < program.getSessionsPerWeek()) {
				return new EnrollmentProgress(program.getSlug(), week.getWeekNumber(), weeks.size(), done,
						program.getSessionsPerWeek(), week.getRoutineSlug(), false, enrollment.getStartedAt());
			}
		}
		ProgramWeek last = weeks.getLast();
		return new EnrollmentProgress(program.getSlug(), last.getWeekNumber(), weeks.size(),
				program.getSessionsPerWeek(), program.getSessionsPerWeek(), last.getRoutineSlug(), true,
				enrollment.getStartedAt());
	}

}
