package com.prepadel.review;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Lo que el fisioterapeuta ha dicho de una pieza del contenido. */
@Entity
public class ReviewItem {

	public enum Verdict {
		APPROVED,
		/** Pide cambios: el comentario dice cuáles. */
		CHANGES
	}

	@Id
	private String itemKey;

	private String status;

	private String comment;

	/** Huella del contenido tal como estaba al revisarlo. */
	private String contentHash;

	private Instant reviewedAt;

	protected ReviewItem() {
	}

	public ReviewItem(String itemKey) {
		this.itemKey = itemKey;
	}

	public void record(Verdict verdict, String comment, String contentHash, Instant when) {
		this.status = verdict.name();
		this.comment = comment;
		this.contentHash = contentHash;
		this.reviewedAt = when;
	}

	public String getItemKey() {
		return itemKey;
	}

	public Verdict getVerdict() {
		return Verdict.valueOf(status);
	}

	public String getComment() {
		return comment;
	}

	public String getContentHash() {
		return contentHash;
	}

	public Instant getReviewedAt() {
		return reviewedAt;
	}

}
