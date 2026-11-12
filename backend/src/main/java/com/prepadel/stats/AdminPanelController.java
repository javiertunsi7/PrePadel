package com.prepadel.stats;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import com.prepadel.stats.RetentionStats.AbandonedExercise;
import com.prepadel.web.PasswordGate;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

/**
 * Panel de retención para quien lleva el producto. Solo cifras agregadas.
 *
 * Se entra con la contraseña de prepadel.admin.password (el navegador la pide;
 * el usuario da igual). Sin contraseña configurada el panel no existe (404).
 * Cuelga de /api para que la app instalada no lo confunda con una pantalla suya.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminPanelController {

	private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("d/M/yyyy HH:mm")
		.withZone(ZoneId.of("Europe/Madrid"));

	private final RetentionStatsService statsService;
	private final PasswordGate gate;

	public AdminPanelController(RetentionStatsService statsService,
			@Value("${prepadel.admin.password:}") String password) {
		this.statsService = statsService;
		this.gate = new PasswordGate(password, true);
	}

	@GetMapping("/stats")
	public RetentionStats stats(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
			HttpServletResponse response) {
		authorize(authorization, response);
		return statsService.stats();
	}

	@GetMapping(value = "/panel", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
	public String panel(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
			HttpServletResponse response) {
		authorize(authorization, response);
		return html(statsService.stats());
	}

	private void authorize(String authorization, HttpServletResponse response) {
		gate.check(authorization, response);
	}

	private static String html(RetentionStats stats) {
		StringBuilder rows = new StringBuilder();
		for (AbandonedExercise item : stats.abandonedExercises()) {
			rows.append("<tr><td>").append(HtmlUtils.htmlEscape(item.exercise())).append("</td><td>")
				.append(HtmlUtils.htmlEscape(item.routine())).append("</td><td class=\"n\">")
				.append(item.times()).append("</td></tr>");
		}
		if (rows.isEmpty()) {
			rows.append("<tr><td colspan=\"3\">Todavía nadie ha salido de una rutina a medias.</td></tr>");
		}
		String retention = stats.retentionPercent() == null
				? "Aún no hay jugadores con 14 días de antigüedad."
				: "%d de %d (%d %%)".formatted(stats.retained(), stats.cohort(), stats.retentionPercent());
		long ended = stats.completions30d() + stats.abandonments30d();
		String finished = ended == 0 ? "Sin datos todavía."
				: "%d de %d (%d %%)".formatted(stats.completions30d(), ended,
						Math.round(100.0 * stats.completions30d() / ended));
		return """
				<!doctype html>
				<html lang="es">
				<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<meta name="robots" content="noindex">
				<title>PrePádel · Retención</title>
				<style>
				body { font: 16px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 760px; padding: 24px 16px; color: #1d2433; background: #fff7ea; }
				h1 { font-size: 24px; margin: 0 0 4px; }
				h2 { font-size: 18px; margin: 32px 0 8px; }
				.muted { color: #5b6472; font-size: 14px; }
				.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 16px; }
				.tile { background: #fff; border-radius: 12px; padding: 14px 16px; }
				.tile b { display: block; font-size: 28px; }
				table { width: 100%%; border-collapse: collapse; background: #fff; border-radius: 12px; }
				th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f0e6d6; }
				.n { text-align: right; font-variant-numeric: tabular-nums; }
				</style>
				</head>
				<body>
				<h1>PrePádel · Retención</h1>
				<p class="muted">Cifras agregadas, calculadas el %s (hora peninsular).</p>
				<div class="tiles">
				<div class="tile"><b>%d</b>jugadores en total</div>
				<div class="tile"><b>%d</b>altas en 7 días</div>
				<div class="tile"><b>%d</b>activos en 7 días</div>
				<div class="tile"><b>%d</b>activos en 30 días</div>
				</div>
				<p class="muted">Activo: ha terminado al menos una rutina en ese periodo.</p>
				<h2>¿Vuelven en su segunda semana?</h2>
				<p>%s</p>
				<p class="muted">De los jugadores con 14 días o más desde el alta, los que terminaron alguna rutina entre el día 7 y el 14.</p>
				<h2>Rutinas terminadas en 30 días</h2>
				<p>%s</p>
				<p class="muted">Sobre las que se terminan o se dejan con el botón «Salir». Cerrar la app sin pulsarlo no se registra.</p>
				<h2>Ejercicios donde más se abandona</h2>
				<table>
				<tr><th>Ejercicio</th><th>Rutina</th><th class="n">Veces</th></tr>
				%s
				</table>
				</body>
				</html>
				""".formatted(WHEN.format(stats.generatedAt()), stats.players(), stats.newPlayers7d(), stats.active7d(),
				stats.active30d(), retention, finished, rows);
	}

}
