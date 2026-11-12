package com.prepadel.web;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Cabeceras de seguridad en todas las respuestas: la web, la API y los errores. */
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

	/**
	 * La app solo carga lo suyo: scripts, estilos, fuentes e iconos salen de este
	 * mismo servidor. 'unsafe-inline' en estilos lo necesitan los style="" de React.
	 * media-src admite https para los vídeos de los ejercicios (exercise.video_url).
	 */
	static final String CONTENT_SECURITY_POLICY = String.join("; ", "default-src 'self'",
			"style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "media-src 'self' https:",
			"object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'");

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader("X-Frame-Options", "DENY");
		response.setHeader("Referrer-Policy", "no-referrer");
		response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
		if (request.isSecure()) {
			// Solo por HTTPS (en local no hay): el navegador ya no vuelve a probar por HTTP.
			response.setHeader("Strict-Transport-Security", "max-age=31536000");
		}
		chain.doFilter(request, response);
	}

}
