package com.prepadel.pain;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * @param id         generado en el móvil (reintentos sin duplicados)
 * @param context    opcional; por defecto, después de un partido
 * @param recordedAt opcional; hora del móvil si se registró sin cobertura
 */
public record PainRequest(
		@NotNull UUID id,
		@NotBlank String zone,
		@NotNull @Min(0) @Max(10) Integer score,
		PainContext context,
		Instant recordedAt) {

}
