package com.prepadel.reminder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;

/**
 * Genera el par de claves con el que el servidor firma los avisos (VAPID).
 * Se ejecuta una sola vez, antes del primer despliegue:
 *
 * <pre>
 * cd backend
 * ./mvnw -q compile
 * java -cp target/classes com.prepadel.reminder.VapidKeyGenerator
 * </pre>
 *
 * La clave privada es un secreto: va en una variable de entorno, nunca en git.
 */
public final class VapidKeyGenerator {

	private VapidKeyGenerator() {
	}

	public static void main(String[] args) throws Exception {
		KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
		generator.initialize(new ECGenParameterSpec("secp256r1"));
		KeyPair keys = generator.generateKeyPair();

		byte[] scalar = ((ECPrivateKey) keys.getPrivate()).getS().toByteArray();
		byte[] privateKey = new byte[32];
		int length = Math.min(scalar.length, 32);
		System.arraycopy(scalar, scalar.length - length, privateKey, 32 - length, length);

		System.out.println("PREPADEL_PUSH_PUBLIC_KEY=" + WebPush.encode(WebPush.rawPublicKey((ECPublicKey) keys.getPublic())));
		System.out.println("PREPADEL_PUSH_PRIVATE_KEY=" + WebPush.encode(privateKey));
		System.out.println("PREPADEL_PUSH_SUBJECT=mailto:tu-correo@ejemplo.com   (cámbialo por tu contacto)");
	}

}
