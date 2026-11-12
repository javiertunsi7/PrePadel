package com.prepadel.review;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.prepadel.content.ContentReview;
import com.prepadel.content.ContentReviewRepository;
import com.prepadel.review.ReviewItem.Verdict;
import com.prepadel.risk.RiskProfileService;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Revisión del contenido por el fisioterapeuta. La app deja de decir "borrador"
 * solo cuando cada pieza está aprobada tal como es hoy y el revisor ha puesto
 * su nombre. Si una pieza aprobada cambia después, se vuelve a borrador.
 */
@Service
public class ReviewService {

	public static final String DRAFT = "DRAFT";
	public static final String REVIEWED = "REVIEWED";

	private static final ZoneId SPAIN = ZoneId.of("Europe/Madrid");

	public enum ItemState {
		PENDING,
		APPROVED,
		CHANGES
	}

	/**
	 * @param outdated había una revisión, pero el contenido ha cambiado desde entonces
	 */
	public record ItemView(String key, ItemState state, String comment, Instant reviewedAt, boolean outdated) {
	}

	public record ReviewView(String status, String reviewerName, String reviewerCredentials, int approved, int total,
			List<ItemView> items, List<String> riskWeights) {
	}

	private final ReviewCatalog catalog;
	private final ReviewItemRepository itemRepository;
	private final ContentReviewRepository contentReviewRepository;
	private final Clock clock;

	public ReviewService(ReviewCatalog catalog, ReviewItemRepository itemRepository,
			ContentReviewRepository contentReviewRepository, Clock clock) {
		this.catalog = catalog;
		this.itemRepository = itemRepository;
		this.contentReviewRepository = contentReviewRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public ReviewView view() {
		Map<String, String> hashes = catalog.currentHashes();
		Map<String, ReviewItem> reviewed = reviewedByKey();
		List<ItemView> items = hashes.entrySet().stream().map(entry -> {
			ReviewItem item = reviewed.get(entry.getKey());
			if (item == null) {
				return new ItemView(entry.getKey(), ItemState.PENDING, null, null, false);
			}
			if (!item.getContentHash().equals(entry.getValue())) {
				return new ItemView(entry.getKey(), ItemState.PENDING, item.getComment(), item.getReviewedAt(), true);
			}
			ItemState state = item.getVerdict() == Verdict.APPROVED ? ItemState.APPROVED : ItemState.CHANGES;
			return new ItemView(entry.getKey(), state, item.getComment(), item.getReviewedAt(), false);
		}).toList();
		ContentReview review = contentReview();
		int approved = (int) items.stream().filter(item -> item.state() == ItemState.APPROVED).count();
		return new ReviewView(review.getStatus(), review.getReviewerName(), review.getReviewerCredentials(), approved,
				items.size(), items, RiskProfileService.describeWeights());
	}

	@Transactional
	public ReviewView sign(String name, String credentials) {
		ContentReview review = contentReview();
		review.update(review.getStatus(), blankToNull(name), blankToNull(credentials), review.getReviewedOn());
		refreshStatus();
		return view();
	}

	@Transactional
	public ReviewView judge(String key, Verdict verdict, String comment) {
		String hash = catalog.currentHashes().get(key);
		if (hash == null) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay nada que revisar con la clave " + key);
		}
		String text = blankToNull(comment);
		if (verdict == Verdict.CHANGES && text == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe qué hay que cambiar");
		}
		ReviewItem item = itemRepository.findById(key).orElseGet(() -> new ReviewItem(key));
		item.record(verdict, text, hash, clock.instant());
		itemRepository.save(item);
		refreshStatus();
		return view();
	}

	/** Al arrancar: una migración nueva puede haber cambiado algo ya aprobado. */
	@EventListener(ApplicationReadyEvent.class)
	@Transactional
	public void refreshOnStartup() {
		refreshStatus();
	}

	/** REVIEWED si todo está aprobado tal como es hoy y hay firma; si no, DRAFT. */
	private void refreshStatus() {
		Map<String, String> hashes = catalog.currentHashes();
		Map<String, ReviewItem> reviewed = reviewedByKey();
		boolean allApproved = hashes.entrySet().stream().allMatch(entry -> {
			ReviewItem item = reviewed.get(entry.getKey());
			return item != null && item.getVerdict() == Verdict.APPROVED
					&& item.getContentHash().equals(entry.getValue());
		});
		ContentReview review = contentReview();
		boolean signed = review.getReviewerName() != null;
		if (allApproved && signed) {
			if (!REVIEWED.equals(review.getStatus())) {
				review.update(REVIEWED, review.getReviewerName(), review.getReviewerCredentials(),
						LocalDate.now(clock.withZone(SPAIN)));
			}
		} else if (!DRAFT.equals(review.getStatus())) {
			review.update(DRAFT, review.getReviewerName(), review.getReviewerCredentials(), null);
		}
	}

	private Map<String, ReviewItem> reviewedByKey() {
		return itemRepository.findAll()
			.stream()
			.collect(java.util.stream.Collectors.toMap(ReviewItem::getItemKey, item -> item));
	}

	private ContentReview contentReview() {
		Optional<ContentReview> review = contentReviewRepository.findById(ContentReview.SINGLETON_ID);
		return review.orElseThrow(() -> new IllegalStateException("Falta la fila de content_review (V2)"));
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}

}
