package com.prepadel.player;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentPlayerArgumentResolver implements HandlerMethodArgumentResolver {

	private static final String BEARER = "Bearer ";

	private final PlayerRepository playerRepository;

	public CurrentPlayerArgumentResolver(PlayerRepository playerRepository) {
		this.playerRepository = playerRepository;
	}

	@Override
	public boolean supportsParameter(MethodParameter parameter) {
		return parameter.hasParameterAnnotation(CurrentPlayer.class)
				&& Player.class.equals(parameter.getParameterType());
	}

	@Override
	public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
			NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
		String header = webRequest.getHeader(HttpHeaders.AUTHORIZATION);
		if (header == null || !header.startsWith(BEARER)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Falta el token de acceso");
		}
		String token = header.substring(BEARER.length()).trim();
		return playerRepository.findByTokenHash(Tokens.hash(token))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token no válido"));
	}

}
