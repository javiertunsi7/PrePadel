package com.prepadel.pain;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

/** Decide cuándo la app debe decirle al jugador que pare y consulte a un profesional. */
@Service
public class PainAlertService {

	private final PainRules rules;

	public PainAlertService(PainRules rules) {
		this.rules = rules;
	}

	/**
	 * @param newestFirst registros del jugador, del más reciente al más antiguo
	 * @param zoneNames   nombre visible de cada zona, en el orden en que se muestran
	 */
	public List<PainAlert> evaluate(List<PainEntry> newestFirst, Map<String, String> zoneNames) {
		List<PainAlert> alerts = new ArrayList<>();
		zoneNames.forEach((zone, name) -> {
			List<PainEntry> entries = newestFirst.stream().filter(entry -> entry.getZoneCode().equals(zone)).toList();
			if (entries.isEmpty()) {
				return;
			}
			PainEntry latest = entries.getFirst();
			if (latest.getScore() >= rules.consultScore()) {
				alerts.add(new PainAlert(zone, PainAlert.Kind.HIGH_PAIN,
						"%s: dolor de %d/10. Para el programa y consulta con un fisioterapeuta o médico antes de seguir."
								.formatted(name, latest.getScore())));
			}
			else if (persistsTooLong(entries)) {
				alerts.add(new PainAlert(zone, PainAlert.Kind.PERSISTENT_PAIN,
						"%s: llevas al menos %d días con molestias de %d/10 o más. Te recomendamos consultar con un fisioterapeuta."
								.formatted(name, rules.persistentDays(), rules.persistentScore())));
			}
		});
		return alerts;
	}

	/** Racha de registros seguidos, contando desde el último, que no bajan del umbral. */
	private boolean persistsTooLong(List<PainEntry> newestFirst) {
		PainEntry latest = newestFirst.getFirst();
		PainEntry oldestInStreak = null;
		for (PainEntry entry : newestFirst) {
			if (entry.getScore() < rules.persistentScore()) {
				break;
			}
			oldestInStreak = entry;
		}
		return oldestInStreak != null
				&& Duration.between(oldestInStreak.getRecordedAt(), latest.getRecordedAt()).toDays() >= rules
						.persistentDays();
	}

}
