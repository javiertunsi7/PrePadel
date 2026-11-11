package com.prepadel.player;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca un parámetro {@link Player} de un controlador: se resuelve a partir de
 * la cabecera {@code Authorization: Bearer <token>} y responde 401 si no vale.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentPlayer {

}
