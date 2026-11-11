package com.prepadel.pain;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Regla "si el dolor supera X o dura más de Y días, consulta".
 * Se configura en application.properties (prepadel.pain.*).
 *
 * @param consultScore    dolor a partir del cual se recomienda parar y consultar
 * @param persistentScore dolor que, si se mantiene, también merece consulta
 * @param persistentDays  días seguidos con ese dolor para lanzar el aviso
 */
@ConfigurationProperties(prefix = "prepadel.pain")
public record PainRules(
		@DefaultValue("7") int consultScore,
		@DefaultValue("4") int persistentScore,
		@DefaultValue("10") int persistentDays) {

}
