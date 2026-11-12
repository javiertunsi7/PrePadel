package com.prepadel.content;

import java.util.Comparator;
import java.util.List;

import com.prepadel.pain.PainRules;
import com.prepadel.reminder.PushGateway;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentService {

	private final BodyZoneRepository zoneRepository;
	private final RoutineRepository routineRepository;
	private final ProgramRepository programRepository;
	private final ContentReviewRepository reviewRepository;
	private final PainRules painRules;
	private final PushGateway pushGateway;

	public ContentService(BodyZoneRepository zoneRepository, RoutineRepository routineRepository,
			ProgramRepository programRepository, ContentReviewRepository reviewRepository, PainRules painRules,
			PushGateway pushGateway) {
		this.pushGateway = pushGateway;
		this.zoneRepository = zoneRepository;
		this.routineRepository = routineRepository;
		this.programRepository = programRepository;
		this.reviewRepository = reviewRepository;
		this.painRules = painRules;
	}

	@Transactional(readOnly = true)
	public ContentResponse catalog() {
		List<BodyZone> zones = zoneRepository.findAllByOrderBySortOrder();
		List<String> zoneOrder = zones.stream().map(BodyZone::getCode).toList();

		List<ContentResponse.RoutineDto> routines = routineRepository.findAllWithSteps().stream()
				.sorted(Comparator.comparing(Routine::getSlug))
				.map(ContentResponse.RoutineDto::from)
				.toList();

		List<ContentResponse.ProgramDto> programs = programRepository.findAllWithWeeks().stream()
				.sorted(Comparator.comparingInt((Program program) -> zoneOrder.indexOf(program.getZoneCode()))
						.thenComparing(Program::getSlug))
				.map(ContentResponse.ProgramDto::from)
				.toList();

		ContentResponse.Review review = reviewRepository.findById(ContentReview.SINGLETON_ID)
				.map(ContentResponse.Review::from)
				.orElse(ContentResponse.Review.DRAFT);

		return new ContentResponse(zones.stream().map(ContentResponse.Zone::from).toList(), routines, programs,
				review, ContentResponse.PainRule.from(painRules), pushGateway.publicKey());
	}

}
