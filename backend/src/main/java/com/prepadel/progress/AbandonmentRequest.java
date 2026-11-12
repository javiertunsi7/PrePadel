package com.prepadel.progress;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * @param id           generado en el móvil (reintentos sin duplicados)
 * @param exerciseSlug ejercicio en el que estaba al salir
 * @param abandonedAt  opcional; hora del móvil si salió sin cobertura
 */
public record AbandonmentRequest(@NotNull UUID id, @NotBlank String routineSlug, @NotBlank String exerciseSlug,
		Instant abandonedAt) {

}
