package com.prepadel.content;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Exercise {

	@Id
	private String slug;

	private String name;

	/** Zona principal que trabaja; null si es un ejercicio general. */
	private String zoneCode;

	private String instructions;

	/** Frase corta que lee la voz en el modo manos libres. */
	private String voiceCue;

	private String equipment;

	/** Si es true, a mitad de tiempo se avisa de cambiar de lado. */
	private boolean switchSides;

	/** Vídeo corto del ejercicio (CDN externo). Null hasta que se grabe. */
	private String videoUrl;

	protected Exercise() {
	}

	public String getSlug() {
		return slug;
	}

	public String getName() {
		return name;
	}

	public String getZoneCode() {
		return zoneCode;
	}

	public String getInstructions() {
		return instructions;
	}

	public String getVoiceCue() {
		return voiceCue;
	}

	public String getEquipment() {
		return equipment;
	}

	public boolean isSwitchSides() {
		return switchSides;
	}

	public String getVideoUrl() {
		return videoUrl;
	}

}
