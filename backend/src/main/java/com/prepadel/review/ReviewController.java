package com.prepadel.review;

import com.prepadel.review.ReviewItem.Verdict;
import com.prepadel.review.ReviewService.ReviewView;
import com.prepadel.web.PasswordGate;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API de la pantalla /revision, donde el fisioterapeuta aprueba o pide cambios
 * en cada pieza del contenido. Contraseña: prepadel.review.password (vacía = 404).
 */
@RestController
@RequestMapping("/api/review")
public class ReviewController {

	public record SignRequest(@Size(max = 120) String name, @Size(max = 160) String credentials) {
	}

	public record JudgeRequest(@NotNull Verdict verdict, @Size(max = 1000) String comment) {
	}

	private final ReviewService service;
	private final PasswordGate gate;

	public ReviewController(ReviewService service, @Value("${prepadel.review.password:}") String password) {
		this.service = service;
		// La contraseña la pide la propia pantalla, no la ventana del navegador.
		this.gate = new PasswordGate(password, false);
	}

	@GetMapping
	public ReviewView view(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
			HttpServletResponse response) {
		gate.check(authorization, response);
		return service.view();
	}

	@PutMapping("/reviewer")
	public ReviewView sign(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
			HttpServletResponse response, @Valid @RequestBody SignRequest request) {
		gate.check(authorization, response);
		return service.sign(request.name(), request.credentials());
	}

	@PutMapping("/items/{key}")
	public ReviewView judge(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
			HttpServletResponse response, @PathVariable String key, @Valid @RequestBody JudgeRequest request) {
		gate.check(authorization, response);
		return service.judge(key, request.verdict(), request.comment());
	}

}
