package com.prepadel.content;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Las rutinas son datos (migraciones SQL), así que estos tests vigilan que el
 * contenido cumpla las reglas del producto cuando alguien lo edite.
 */
@SpringBootTest
@ActiveProfiles("test")
class ContentCatalogTest {

	@Autowired
	private ContentService contentService;

	@Test
	void everyRoutineLastsBetween8And12Minutes() {
		assertThat(contentService.catalog().routines()).isNotEmpty()
				.allSatisfy(routine -> assertThat(routine.totalSeconds()).as(routine.slug()).isBetween(8 * 60, 12 * 60));
	}

	@Test
	void stepsAreNumberedFromOneWithoutGapsAndTheLastOneHasNoRest() {
		assertThat(contentService.catalog().routines()).allSatisfy(routine -> {
			List<Integer> expected = IntStream.rangeClosed(1, routine.steps().size()).boxed().toList();
			assertThat(routine.steps()).as(routine.slug()).extracting(ContentResponse.Step::order).isEqualTo(expected);
			assertThat(routine.steps().getLast().restSeconds()).as(routine.slug()).isZero();
		});
	}

	@Test
	void thereIsAWarmUpAndARecoveryRoutineForMatchDays() {
		assertThat(contentService.catalog().routines()).extracting(ContentResponse.RoutineDto::kind)
				.contains(RoutineKind.WARMUP, RoutineKind.RECOVERY);
	}

	@Test
	void everyZoneHasAFourWeekProgramThatPointsToRoutinesOfThatZone() {
		ContentResponse catalog = contentService.catalog();
		Set<String> zones = catalog.zones().stream().map(ContentResponse.Zone::code).collect(Collectors.toSet());

		assertThat(zones).containsExactlyInAnyOrder("ELBOW", "SHOULDER", "KNEE");
		assertThat(catalog.programs()).extracting(ContentResponse.ProgramDto::zone)
				.containsExactly("ELBOW", "SHOULDER", "KNEE");

		assertThat(catalog.programs()).allSatisfy(program -> {
			assertThat(program.weeks()).as(program.slug()).extracting(ContentResponse.Week::week)
					.containsExactly(1, 2, 3, 4);
			assertThat(program.weeks()).allSatisfy(week -> {
				ContentResponse.RoutineDto routine = catalog.routines().stream()
						.filter(candidate -> candidate.slug().equals(week.routineSlug()))
						.findFirst()
						.orElseThrow();
				assertThat(routine.kind()).isEqualTo(RoutineKind.PROGRAM);
				assertThat(routine.zone()).isEqualTo(program.zone());
			});
		});
	}

	@Test
	void everyExerciseHasInstructionsAndAVoiceCueForHandsFreeMode() {
		assertThat(contentService.catalog().routines()).flatExtracting(ContentResponse.RoutineDto::steps)
				.allSatisfy(step -> {
					assertThat(step.instructions()).as(step.exerciseSlug()).isNotBlank();
					assertThat(step.voiceCue()).as(step.exerciseSlug()).isNotBlank();
					assertThat(step.durationSeconds()).as(step.exerciseSlug()).isGreaterThanOrEqualTo(30);
				});
	}

}
