package com.prepadel.reminder;

import java.math.BigInteger;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.time.Instant;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Lo que pide el estándar Web Push para mandar un aviso a un navegador, sin
 * librerías: cifrado del mensaje (RFC 8291, aes128gcm) y firma del servidor
 * (VAPID, RFC 8292). El servicio de notificaciones (Google, Apple...) solo ve
 * bytes cifrados: el texto lo descifra el móvil del jugador.
 */
final class WebPush {

	private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
	private static final Base64.Decoder B64_DECODER = Base64.getUrlDecoder();
	private static final SecureRandom RANDOM = new SecureRandom();
	private static final ECParameterSpec P256 = p256();
	private static final int RECORD_SIZE = 4096;

	private WebPush() {
	}

	/** Cuerpo cifrado de la petición, con una clave efímera y una sal nuevas cada vez. */
	static byte[] encrypt(byte[] plaintext, String p256dh, String auth) throws GeneralSecurityException {
		KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
		generator.initialize(new ECGenParameterSpec("secp256r1"), RANDOM);
		byte[] salt = new byte[16];
		RANDOM.nextBytes(salt);
		return encrypt(plaintext, p256dh, auth, generator.generateKeyPair(), salt);
	}

	static byte[] encrypt(byte[] plaintext, String p256dh, String auth, KeyPair serverKeys, byte[] salt)
			throws GeneralSecurityException {
		byte[] clientPublic = decode(p256dh);
		byte[] authSecret = decode(auth);
		if (clientPublic.length != 65 || clientPublic[0] != 4 || authSecret.length != 16) {
			throw new GeneralSecurityException("Suscripción de notificaciones mal formada");
		}
		// Un solo registro: el texto y el byte de cierre deben caber en él.
		if (plaintext.length > RECORD_SIZE - 17) {
			throw new GeneralSecurityException("Mensaje demasiado largo");
		}
		byte[] serverPublic = rawPublicKey((ECPublicKey) serverKeys.getPublic());

		KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
		agreement.init(serverKeys.getPrivate());
		agreement.doPhase(publicKey(clientPublic), true);
		byte[] shared = agreement.generateSecret();

		byte[] keyInfo = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), clientPublic, serverPublic);
		byte[] inputKey = hkdf(authSecret, shared, keyInfo, 32);
		byte[] contentKey = hkdf(salt, inputKey, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
		byte[] nonce = hkdf(salt, inputKey, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

		Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
		cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(contentKey, "AES"), new GCMParameterSpec(128, nonce));
		byte[] ciphertext = cipher.doFinal(concat(plaintext, new byte[] { 2 })); // 2 = último registro

		return ByteBuffer.allocate(16 + 4 + 1 + serverPublic.length + ciphertext.length)
			.put(salt)
			.putInt(RECORD_SIZE)
			.put((byte) serverPublic.length)
			.put(serverPublic)
			.put(ciphertext)
			.array();
	}

	/**
	 * Cabecera Authorization con la que el servidor se identifica ante el servicio de notificaciones.
	 *
	 * @param endpoint   dirección de la suscripción; la firma solo vale para su servidor
	 * @param subject    contacto del responsable (mailto: o https:)
	 * @param publicKey  clave pública VAPID, la misma que usó la app al suscribirse
	 * @param privateKey su clave privada (32 bytes en base64url)
	 */
	static String vapidAuthorization(URI endpoint, String subject, String publicKey, String privateKey, Instant now)
			throws GeneralSecurityException {
		String audience = endpoint.getScheme() + "://" + endpoint.getAuthority();
		String header = B64.encodeToString("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
		String claims = B64.encodeToString("{\"aud\":\"%s\",\"exp\":%d,\"sub\":\"%s\"}"
			.formatted(audience, now.getEpochSecond() + 12 * 3600, subject)
			.getBytes(StandardCharsets.UTF_8));
		String unsigned = header + "." + claims;

		Signature signature = Signature.getInstance("SHA256withECDSAinP1363Format");
		signature.initSign(privateKey(decode(privateKey)));
		signature.update(unsigned.getBytes(StandardCharsets.US_ASCII));
		return "vapid t=" + unsigned + "." + B64.encodeToString(signature.sign()) + ", k=" + publicKey;
	}

	static ECPublicKey publicKey(byte[] uncompressedPoint) throws GeneralSecurityException {
		ECPoint point = new ECPoint(new BigInteger(1, uncompressedPoint, 1, 32),
				new BigInteger(1, uncompressedPoint, 33, 32));
		return (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(point, P256));
	}

	static ECPrivateKey privateKey(byte[] scalar) throws GeneralSecurityException {
		return (ECPrivateKey) KeyFactory.getInstance("EC")
			.generatePrivate(new ECPrivateKeySpec(new BigInteger(1, scalar), P256));
	}

	/** Punto sin comprimir: 0x04, X e Y con 32 bytes cada una. */
	static byte[] rawPublicKey(ECPublicKey key) {
		byte[] raw = new byte[65];
		raw[0] = 4;
		copyPadded(key.getW().getAffineX(), raw, 1);
		copyPadded(key.getW().getAffineY(), raw, 33);
		return raw;
	}

	static byte[] decode(String base64Url) throws GeneralSecurityException {
		try {
			return B64_DECODER.decode(base64Url);
		} catch (IllegalArgumentException malformed) {
			throw new GeneralSecurityException("Base64 mal formado", malformed);
		}
	}

	static String encode(byte[] bytes) {
		return B64.encodeToString(bytes);
	}

	/** HKDF de un solo bloque (salida de hasta 32 bytes), que es todo lo que usa Web Push. */
	private static byte[] hkdf(byte[] salt, byte[] inputKey, byte[] info, int length) throws GeneralSecurityException {
		byte[] pseudoRandomKey = hmac(salt, inputKey);
		byte[] block = hmac(pseudoRandomKey, concat(info, new byte[] { 1 }));
		byte[] output = new byte[length];
		System.arraycopy(block, 0, output, 0, length);
		return output;
	}

	private static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
		Mac mac = Mac.getInstance("HmacSHA256");
		mac.init(new SecretKeySpec(key, "HmacSHA256"));
		return mac.doFinal(data);
	}

	private static void copyPadded(BigInteger value, byte[] target, int offset) {
		byte[] bytes = value.toByteArray(); // puede traer un cero de signo delante o venir corto
		int length = Math.min(bytes.length, 32);
		System.arraycopy(bytes, bytes.length - length, target, offset + 32 - length, length);
	}

	private static byte[] concat(byte[]... parts) {
		int total = 0;
		for (byte[] part : parts) {
			total += part.length;
		}
		ByteBuffer buffer = ByteBuffer.allocate(total);
		for (byte[] part : parts) {
			buffer.put(part);
		}
		return buffer.array();
	}

	private static ECParameterSpec p256() {
		try {
			AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
			parameters.init(new ECGenParameterSpec("secp256r1"));
			return parameters.getParameterSpec(ECParameterSpec.class);
		} catch (GeneralSecurityException impossible) {
			throw new IllegalStateException(impossible);
		}
	}

}
