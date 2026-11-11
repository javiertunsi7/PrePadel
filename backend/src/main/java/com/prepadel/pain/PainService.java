package com.prepadel.pain;

import java.time.Clock;
import java.util.UUID;

import com.prepadel.common.ClientTime;
import com.prepadel.content.BodyZoneRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PainService {

	private final PainEntryRepository painRepository;
	private final BodyZoneRepository zoneRepository;
	private final Clock clock;

	public PainService(PainEntryRepository painRepository, BodyZoneRepository zoneRepository, Clock clock) {
		this.painRepository = painRepository;
		this.zoneRepository = zoneRepository;
		this.clock = clock;
	}

	@Transactional
	public void log(UUID playerId, PainRequest request) {
		if (painRepository.existsById(request.id())) {
			return; // reintento de un registro que ya llegó
		}
		if (!zoneRepository.existsById(request.zone())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zona desconocida: " + request.zone());
		}
		PainContext context = request.context() != null ? request.context() : PainContext.POST_MATCH;
		painRepository.save(new PainEntry(request.id(), playerId, request.zone(), request.score(), context,
				ClientTime.orNow(request.recordedAt(), clock.instant())));
	}

}
