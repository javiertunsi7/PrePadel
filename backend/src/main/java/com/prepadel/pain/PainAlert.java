package com.prepadel.pain;

public record PainAlert(String zone, Kind kind, String message) {

	public enum Kind {
		/** El último registro alcanza el umbral de consulta. */
		HIGH_PAIN,
		/** Molestia moderada que no baja con los días. */
		PERSISTENT_PAIN
	}

}
