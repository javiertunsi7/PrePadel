package com.prepadel.pain;

/** En qué momento se registró el dolor. */
public enum PainContext {
	/** Molestias declaradas en el cuestionario inicial. */
	ONBOARDING,
	/** Registro rápido después de un partido. */
	POST_MATCH,
	/** Registro suelto, sin partido de por medio. */
	CHECK_IN
}
