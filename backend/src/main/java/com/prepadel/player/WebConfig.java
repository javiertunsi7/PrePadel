package com.prepadel.player;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final CurrentPlayerArgumentResolver currentPlayerResolver;

	public WebConfig(CurrentPlayerArgumentResolver currentPlayerResolver) {
		this.currentPlayerResolver = currentPlayerResolver;
	}

	@Override
	public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
		resolvers.add(currentPlayerResolver);
	}

}
