package com.prepadel.content;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Zona del cuerpo que trabaja la app (codo, hombro, rodilla...). Añadir una zona es añadir una fila. */
@Entity
public class BodyZone {

	@Id
	private String code;

	private String name;

	private String tagline;

	private int sortOrder;

	protected BodyZone() {
	}

	public String getCode() {
		return code;
	}

	public String getName() {
		return name;
	}

	public String getTagline() {
		return tagline;
	}

	public int getSortOrder() {
		return sortOrder;
	}

}
