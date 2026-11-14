package com.prepadel.player;

import java.util.Collections;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Clubes que reparten la app con su enlace (/?club=código), según prepadel.clubs.
 *
 * Solo se guardan esos códigos: un enlace mal copiado o inventado no ensucia el panel
 * ni deja en la base de datos un texto que no sabemos qué es.
 */
@Component
public class Clubs {

	private static final Logger log = LoggerFactory.getLogger(Clubs.class);

	/** Minúsculas, cifras y guiones: cabe en un enlace sin codificar nada. */
	private static final Pattern CODE = Pattern.compile("[a-z0-9-]{2,40}");

	private final Set<String> codes = new TreeSet<>();

	public Clubs(@Value("${prepadel.clubs:}") String configured) {
		for (String entry : configured.split(",")) {
			String code = normalize(entry);
			if (code.isEmpty()) {
				continue;
			}
			if (CODE.matcher(code).matches()) {
				codes.add(code);
			}
			else {
				log.warn("prepadel.clubs: «{}» no vale como código de club (minúsculas, cifras y guiones; de 2 a 40)",
						entry.trim());
			}
		}
	}

	/** El código tal y como se guarda, o null si no es de un club configurado. El alta sigue igual en los dos casos. */
	public String recognize(String code) {
		if (code == null) {
			return null;
		}
		String normalized = normalize(code);
		return codes.contains(normalized) ? normalized : null;
	}

	/** Los clubes configurados, en orden alfabético. */
	public Set<String> codes() {
		return Collections.unmodifiableSet(codes);
	}

	private static String normalize(String code) {
		return code.trim().toLowerCase(Locale.ROOT);
	}

}
