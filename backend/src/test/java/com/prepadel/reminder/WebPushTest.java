package com.prepadel.reminder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Base64;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebPushTest {

	/** Ejemplo completo del apéndice A del RFC 8291: mismas claves y sal, mismo resultado byte a byte. */
	@Test
	void encryptsExactlyLikeTheExampleInTheStandard() throws Exception {
		KeyPair serverKeys = new KeyPair(
				WebPush.publicKey(WebPush.decode(
						"BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8")),
				WebPush.privateKey(WebPush.decode("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw")));

		byte[] body = WebPush.encrypt("When I grow up, I want to be a watermelon".getBytes(StandardCharsets.UTF_8),
				"BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
				"BTBZMqHH6r4Tts7J_aSIgg", serverKeys, WebPush.decode("DGv6ra1nlYgDCS1FRnbzlw"));

		assertThat(WebPush.encode(body)).isEqualTo("DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml"
				+ "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVW"
				+ "GNWQexSgSxsj_Qulcy4a-fN");
	}

	@Test
	void everyMessageUsesAFreshKeyAndSalt() throws Exception {
		KeyPair phone = newKeyPair();
		String p256dh = WebPush.encode(WebPush.rawPublicKey((ECPublicKey) phone.getPublic()));
		String auth = WebPush.encode(new byte[16]);

		byte[] first = WebPush.encrypt("hola".getBytes(StandardCharsets.UTF_8), p256dh, auth);
		byte[] second = WebPush.encrypt("hola".getBytes(StandardCharsets.UTF_8), p256dh, auth);

		assertThat(first).isNotEqualTo(second).hasSize(16 + 4 + 1 + 65 + 4 + 1 + 16);
	}

	@Test
	void rejectsAMalformedSubscription() {
		assertThatThrownBy(() -> WebPush.encrypt(new byte[1], "no-es-una-clave", "BTBZMqHH6r4Tts7J_aSIgg"))
			.isInstanceOf(GeneralSecurityException.class);
	}

	@Test
	void signsTheServerIdentityForThePushServiceOfTheSubscription() throws Exception {
		KeyPair vapid = newKeyPair();
		String publicKey = WebPush.encode(WebPush.rawPublicKey((ECPublicKey) vapid.getPublic()));
		String privateKey = WebPush.encode(pad32(((java.security.interfaces.ECPrivateKey) vapid.getPrivate()).getS()
			.toByteArray()));

		String authorization = WebPush.vapidAuthorization(URI.create("https://fcm.googleapis.com/fcm/send/abc"),
				"mailto:hola@example.org", publicKey, privateKey, Instant.parse("2026-11-12T10:00:00Z"));

		assertThat(authorization).startsWith("vapid t=").endsWith(", k=" + publicKey);
		String[] jwt = authorization.substring(8, authorization.indexOf(',')).split("\\.");
		String claims = new String(Base64.getUrlDecoder().decode(jwt[1]), StandardCharsets.UTF_8);
		assertThat(claims).contains("\"aud\":\"https://fcm.googleapis.com\"")
			.contains("\"sub\":\"mailto:hola@example.org\"")
			.contains("\"exp\":" + (Instant.parse("2026-11-12T22:00:00Z").getEpochSecond()));

		Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
		verifier.initVerify(vapid.getPublic());
		verifier.update((jwt[0] + "." + jwt[1]).getBytes(StandardCharsets.US_ASCII));
		assertThat(verifier.verify(Base64.getUrlDecoder().decode(jwt[2]))).isTrue();
	}

	private static KeyPair newKeyPair() throws GeneralSecurityException {
		KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
		generator.initialize(new ECGenParameterSpec("secp256r1"));
		return generator.generateKeyPair();
	}

	private static byte[] pad32(byte[] value) {
		byte[] padded = new byte[32];
		int length = Math.min(value.length, 32);
		System.arraycopy(value, value.length - length, padded, 32 - length, length);
		return padded;
	}

}
