package com.prepadel.player;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final CurrentPlayerArgumentResolver currentPlayerResolver;
	private final RegistrationRateLimiter registrationRateLimiter;

	public WebConfig(CurrentPlayerArgumentResolver currentPlayerResolver,
			RegistrationRateLimiter registrationRateLimiter) {
		this.currentPlayerResolver = currentPlayerResolver;
		this.registrationRateLimiter = registrationRateLimiter;
	}

	@Override
	public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
		resolvers.add(currentPlayerResolver);
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(registrationRateLimiter).addPathPatterns("/api/players");
	}

}
