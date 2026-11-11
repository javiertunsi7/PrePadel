package com.prepadel.player;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.prepadel.content.BodyZone;
import com.prepadel.content.BodyZoneRepository;
import com.prepadel.content.Program;
import com.prepadel.content.ProgramRepository;
import com.prepadel.pain.PainAlertService;
import com.prepadel.pain.PainEntry;
import com.prepadel.pain.PainEntryRepository;
import com.prepadel.progress.ProgressService;
import com.prepadel.progress.RoutineCompletionRepository;
import com.prepadel.risk.RiskProfileService;
import com.prepadel.risk.ZoneRisk;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerStateService {

	private static final Duration PAIN_HISTORY = Duration.ofDays(90);
	private static final Duration COMPLETION_HISTORY = Duration.ofDays(45);

	private final BodyZoneRepository zoneRepository;
	private final ProgramRepository programRepository;
	private final PainEntryRepository painRepository;
	private final RoutineCompletionRepository completionRepository;
	private final RiskProfileService riskService;
	private final PainAlertService alertService;
	private final ProgressService progressService;
	private final Clock clock;

	public PlayerStateService(BodyZoneRepository zoneRepository, ProgramRepository programRepository,
			PainEntryRepository painRepository, RoutineCompletionRepository completionRepository,
			RiskProfileService riskService, PainAlertService alertService, ProgressService progressService,
			Clock clock) {
		this.zoneRepository = zoneRepository;
		this.programRepository = programRepository;
		this.painRepository = painRepository;
		this.completionRepository = completionRepository;
		this.riskService = riskService;
		this.alertService = alertService;
		this.progressService = progressService;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public PlayerState stateOf(Player player) {
		Instant now = clock.instant();
		List<BodyZone> zones = zoneRepository.findAllByOrderBySortOrder();
		List<PainEntry> pain = painRepository.findByPlayerIdAndRecordedAtAfterOrderByRecordedAtDesc(player.getId(),
				now.minus(PAIN_HISTORY));

		// La lista viene de más reciente a más antiguo: el primero de cada zona es el último dolor.
		Map<String, Integer> latestPain = new HashMap<>();
		pain.forEach(entry -> latestPain.putIfAbsent(entry.getZoneCode(), entry.getScore()));

		List<ZoneRisk> risk = riskService.assess(player.getAge(), player.getWeeklyHours(), player.getSkillLevel(),
				latestPain, zones.stream().map(BodyZone::getCode).toList());

		String recommendedProgram = riskService.priorityZone(risk)
				.flatMap(programRepository::findFirstByZoneCodeOrderBySlug)
				.map(Program::getSlug)
				.orElse(null);

		Map<String, String> zoneNames = new LinkedHashMap<>();
		zones.forEach(zone -> zoneNames.put(zone.getCode(), zone.getName()));

		return new PlayerState(
				PlayerState.Profile.from(player),
				risk,
				recommendedProgram,
				progressService.activeProgress(player.getId()).orElse(null),
				completionRepository
						.findByPlayerIdAndCompletedAtAfterOrderByCompletedAtDesc(player.getId(),
								now.minus(COMPLETION_HISTORY))
						.stream()
						.map(PlayerState.Completion::from)
						.toList(),
				pain.stream().map(PlayerState.Pain::from).toList(),
				alertService.evaluate(pain, zoneNames));
	}

}
