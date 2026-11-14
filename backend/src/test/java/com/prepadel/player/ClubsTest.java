package com.prepadel.player;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Los clubes de prepadel.clubs y cómo se reconoce el código que llega con su enlace. */
class ClubsTest {

	@Test
	void readsTheConfiguredCodesAndSkipsTheOnesThatAreNotValid() {
		Clubs clubs = new Clubs(" Padel-Elche , club norte,x, alicante-2 ,,");

		assertThat(clubs.codes()).containsExactly("alicante-2", "padel-elche");
	}

	@Test
	void recognizesOnlyConfiguredClubsWhateverTheCaseOrTheSpaces() {
		Clubs clubs = new Clubs("padel-elche");

		assertThat(clubs.recognize(" PADEL-Elche ")).isEqualTo("padel-elche");
		assertThat(clubs.recognize("padel-alicante")).isNull();
		assertThat(clubs.recognize("")).isNull();
		assertThat(clubs.recognize(null)).isNull();
	}

	@Test
	void withoutConfigurationThereAreNoClubs() {
		Clubs clubs = new Clubs("");

		assertThat(clubs.codes()).isEmpty();
		assertThat(clubs.recognize("padel-elche")).isNull();
	}

}
