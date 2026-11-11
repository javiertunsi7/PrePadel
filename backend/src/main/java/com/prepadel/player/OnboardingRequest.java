package com.prepadel.player;

import java.util.Map;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Cuestionario inicial.
 *
 * @param discomfort        molestia actual de 0 a 10 por código de zona
 * @param healthDataConsent consentimiento explícito para guardar datos de salud (RGPD)
 */
public record OnboardingRequest(
		@NotNull @Min(18) @Max(99) Integer age,
		@NotNull @Min(0) @Max(40) Integer weeklyHours,
		@NotNull SkillLevel level,
		@NotNull Map<@NotBlank String, @NotNull @Min(0) @Max(10) Integer> discomfort,
		@AssertTrue(message = "Hace falta tu consentimiento para guardar datos de salud") boolean healthDataConsent) {

}
