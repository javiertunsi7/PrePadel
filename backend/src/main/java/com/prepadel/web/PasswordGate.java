package com.prepadel.web;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Puerta con una sola contraseña para las páginas internas (panel de retención,
 * revisión del fisio). Va en la cabecera "Basic base64(usuario:contraseña)"; el
 * usuario da igual. Sin contraseña configurada, la página no existe (404).
 */
public final class PasswordGate {

	private final byte[] password;
	private final boolean browserPrompt;

	/**
	 * @param browserPrompt true si el navegador debe pedir la contraseña con su ventana propia
	 *                      (página que se abre directamente); false si la pide la app
	 */
	public PasswordGate(String password, boolean browserPrompt) {
		this.password = password == null ? new byte[0] : password.getBytes(StandardCharsets.UTF_8);
		this.browserPrompt = browserPrompt;
	}

	public void check(String authorization, HttpServletResponse response) {
		if (password.length == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}
		response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
		if (!MessageDigest.isEqual(password, passwordFrom(authorization))) {
			if (browserPrompt) {
				response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Basic realm=\"PrePadel\", charset=\"UTF-8\"");
			}
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contraseña incorrecta");
		}
	}

	/** Devuelve la contraseña de la cabecera, o vacío si no viene bien formada. */
	static byte[] passwordFrom(String authorization) {
		if (authorization == null || !authorization.regionMatches(true, 0, "Basic ", 0, 6)) {
			return new byte[0];
		}
		try {
			String credentials = new String(Base64.getDecoder().decode(authorization.substring(6).trim()),
					StandardCharsets.UTF_8);
			int colon = credentials.indexOf(':');
			return colon < 0 ? new byte[0] : credentials.substring(colon + 1).getBytes(StandardCharsets.UTF_8);
		} catch (IllegalArgumentException notBase64) {
			return new byte[0];
		}
	}

}
