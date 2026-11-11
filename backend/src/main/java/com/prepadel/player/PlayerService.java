package com.prepadel.player;

import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.prepadel.content.BodyZone;
import com.prepadel.content.BodyZoneRepository;
import com.prepadel.pain.PainContext;
import com.prepadel.pain.PainEntry;
import com.prepadel.pain.PainEntryRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlayerService {

	/** Cambiar cuando cambie el texto de consentimiento que se muestra en la app. */
	static final String CONSENT_VERSION = "2026-11";

	/** El token en claro solo existe aquí: se entrega al móvil y no se vuelve a ver. */
	public record Registration(String token, Player player) {
	}

	private final PlayerRepository playerRepository;
	private final PainEntryRepository painRepository;
	private final BodyZoneRepository zoneRepository;
	private final Clock clock;

	public PlayerService(PlayerRepository playerRepository, PainEntryRepository painRepository,
			BodyZoneRepository zoneRepository, Clock clock) {
		this.playerRepository = playerRepository;
		this.painRepository = painRepository;
		this.zoneRepository = zoneRepository;
		this.clock = clock;
	}

	/** Crea el jugador a partir del cuestionario y guarda sus molestias como primer registro de dolor. */
	@Transactional
	public Registration register(OnboardingRequest request) {
		Set<String> knownZones = zoneRepository.findAll().stream().map(BodyZone::getCode).collect(Collectors.toSet());
		for (String zone : request.discomfort().keySet()) {
			if (!knownZones.contains(zone)) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zona desconocida: " + zone);
			}
		}

		Instant now = clock.instant();
		String token = Tokens.newToken();
		Player player = playerRepository.save(new Player(UUID.randomUUID(), Tokens.hash(token), request.age(),
				request.weeklyHours(), request.level(), CONSENT_VERSION, now));

		request.discomfort().forEach((zone, score) -> painRepository
				.save(new PainEntry(UUID.randomUUID(), player.getId(), zone, score, PainContext.ONBOARDING, now)));

		return new Registration(token, player);
	}

	/** Derecho de supresión: la base de datos borra en cascada dolor, programas y rutinas. */
	@Transactional
	public void delete(UUID playerId) {
		playerRepository.deleteById(playerId);
	}

}
