package com.prepadel.web;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * El manifiesto de la app instalable. Tiene su propia ruta porque el servidor
 * no conoce la extensión .webmanifest y lo entregaría como fichero genérico.
 */
@RestController
public class ManifestController {

	static final MediaType WEB_MANIFEST = MediaType.parseMediaType("application/manifest+json");

	private final Resource manifest = new ClassPathResource("static/manifest.webmanifest");

	@GetMapping("/manifest.webmanifest")
	public ResponseEntity<Resource> manifest() {
		if (!manifest.exists()) {
			return ResponseEntity.notFound().build(); // en desarrollo la web la sirve Vite
		}
		return ResponseEntity.ok().contentType(WEB_MANIFEST).cacheControl(CacheControl.noCache()).body(manifest);
	}

}
