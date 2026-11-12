package com.prepadel.web;

import java.io.IOException;
import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * En producción el mismo servidor sirve la API y la web (el frontend ya
 * construido va dentro del jar, en static/). En desarrollo la web la sirve
 * Vite y aquí no hay nada que servir.
 */
@Configuration
public class StaticWebConfig implements WebMvcConfigurer {

	private static final String WEB = "classpath:/static/";

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		// Vite pone una huella en el nombre de estos ficheros: si cambian, cambia el nombre,
		// así que el navegador puede guardarlos un año sin volver a preguntar.
		registry.addResourceHandler("/assets/**")
			.addResourceLocations(WEB + "assets/")
			.setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());

		// El resto (index.html, service worker, manifiesto, iconos) se revalida siempre:
		// así una versión nueva de la app llega en la siguiente visita.
		registry.addResourceHandler("/**")
			.addResourceLocations(WEB)
			.setCacheControl(CacheControl.noCache())
			.resourceChain(true)
			.addResolver(new AppRouteResolver());
	}

	/**
	 * Las pantallas de la app (/programas/codo-de-padel, /dolor...) no son ficheros:
	 * las pinta el JavaScript de index.html. Si alguien abre o recarga una de esas
	 * direcciones, se le entrega index.html y la app se encarga del resto.
	 */
	static class AppRouteResolver extends PathResourceResolver {

		@Override
		protected Resource getResource(String resourcePath, Resource location) throws IOException {
			Resource requested = super.getResource(resourcePath, location);
			if (requested != null) {
				return requested;
			}
			return isAppRoute(resourcePath) ? super.getResource("index.html", location) : null;
		}

		/** Ni la API ni un fichero que falta (algo con extensión) deben responder con la web. */
		static boolean isAppRoute(String path) {
			return !path.startsWith("api/") && !path.startsWith("actuator/") && !path.contains(".");
		}

	}

}
