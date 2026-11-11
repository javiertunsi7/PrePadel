package com.prepadel.progress;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * @param id          generado en el móvil (reintentos sin duplicados)
 * @param completedAt opcional; hora del móvil si se terminó sin cobertura
 */
public record CompletionRequest(@NotNull UUID id, @NotBlank String routineSlug, Instant completedAt) {

}
