package com.prepadel.content;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/**
 * Quién ha validado el contenido. Mientras el estado sea DRAFT la app avisa
 * de que los ejercicios están pendientes de revisión profesional.
 */
@Entity
public class ContentReview {

	public static final int SINGLETON_ID = 1;

	@Id
	private Integer id;

	private String status;

	private String reviewerName;

	private String reviewerCredentials;

	private LocalDate reviewedOn;

	protected ContentReview() {
	}

	public String getStatus() {
		return status;
	}

	public String getReviewerName() {
		return reviewerName;
	}

	public String getReviewerCredentials() {
		return reviewerCredentials;
	}

	public LocalDate getReviewedOn() {
		return reviewedOn;
	}

}
