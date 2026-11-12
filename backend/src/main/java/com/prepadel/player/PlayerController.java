package com.prepadel.player;

import com.prepadel.pain.PainRequest;
import com.prepadel.pain.PainService;
import com.prepadel.progress.AbandonmentRequest;
import com.prepadel.progress.CompletionRequest;
import com.prepadel.progress.ProgressService;
import com.prepadel.reminder.ReminderRequest;
import com.prepadel.reminder.ReminderService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** API del jugador. Todo lo que cuelga de /api/me exige el token del móvil. */
@RestController
@RequestMapping("/api")
public class PlayerController {

	public record RegistrationResponse(String token, PlayerState state) {
	}

	public record EnrollmentRequest(@NotBlank String programSlug) {
	}

	private final PlayerService playerService;
	private final PlayerStateService stateService;
	private final ProgressService progressService;
	private final PainService painService;
	private final ReminderService reminderService;
	private final PlayerExportService exportService;

	public PlayerController(PlayerService playerService, PlayerStateService stateService,
			ProgressService progressService, PainService painService, ReminderService reminderService,
			PlayerExportService exportService) {
		this.reminderService = reminderService;
		this.exportService = exportService;
		this.playerService = playerService;
		this.stateService = stateService;
		this.progressService = progressService;
		this.painService = painService;
	}

	/** Cuestionario inicial: crea el jugador y devuelve su token (solo esta vez) y su perfil de riesgo. */
	@PostMapping("/players")
	@ResponseStatus(HttpStatus.CREATED)
	public RegistrationResponse register(@Valid @RequestBody OnboardingRequest request) {
		PlayerService.Registration registration = playerService.register(request);
		return new RegistrationResponse(registration.token(), stateService.stateOf(registration.player()));
	}

	@GetMapping("/me")
	public PlayerState me(@CurrentPlayer Player player) {
		return stateService.stateOf(player);
	}

	/** Todo lo que el servidor guarda del jugador, como fichero JSON para descargar. */
	@GetMapping("/me/export")
	public ResponseEntity<PlayerExportService.Export> export(@CurrentPlayer Player player) {
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"prepadel-mis-datos.json\"")
			.cacheControl(CacheControl.noStore())
			.body(exportService.export(player.getId()));
	}

	@DeleteMapping("/me")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteMe(@CurrentPlayer Player player) {
		playerService.delete(player.getId());
	}

	@PostMapping("/me/enrollment")
	public PlayerState enroll(@CurrentPlayer Player player, @Valid @RequestBody EnrollmentRequest request) {
		progressService.enroll(player.getId(), request.programSlug());
		return stateService.stateOf(player);
	}

	@PostMapping("/me/completions")
	public PlayerState complete(@CurrentPlayer Player player, @Valid @RequestBody CompletionRequest request) {
		progressService.complete(player.getId(), request);
		return stateService.stateOf(player);
	}

	@PostMapping("/me/abandonments")
	public PlayerState abandon(@CurrentPlayer Player player, @Valid @RequestBody AbandonmentRequest request) {
		progressService.abandon(player.getId(), request);
		return stateService.stateOf(player);
	}

	/** Hora del próximo partido, para avisar 30 minutos antes aunque la app esté cerrada. */
	@PostMapping("/me/reminder")
	public PlayerState remind(@CurrentPlayer Player player, @Valid @RequestBody ReminderRequest request) {
		reminderService.set(player.getId(), request);
		return stateService.stateOf(player);
	}

	@PostMapping("/me/pain")
	public PlayerState logPain(@CurrentPlayer Player player, @Valid @RequestBody PainRequest request) {
		painService.log(player.getId(), request);
		return stateService.stateOf(player);
	}

}
