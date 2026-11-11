package com.prepadel.content;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ContentController {

	private final ContentService contentService;

	public ContentController(ContentService contentService) {
		this.contentService = contentService;
	}

	/** Público: zonas, rutinas con sus pasos y programas. */
	@GetMapping("/content")
	public ContentResponse content() {
		return contentService.catalog();
	}

}
