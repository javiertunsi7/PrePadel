package com.prepadel.reminder;

/** Entrega un aviso al móvil de un jugador a través del servicio de notificaciones de su navegador. */
public interface PushGateway {

	enum Result {
		DELIVERED,
		/** La suscripción ya no existe (app desinstalada o permiso retirado): no hay que volver a intentarlo. */
		GONE,
		FAILED
	}

	/** Falso si el servidor no tiene claves de notificaciones configuradas. */
	boolean enabled();

	/** Clave pública que la app necesita para suscribirse; null si no está configurado. */
	String publicKey();

	Result send(MatchReminder reminder, String payloadJson);

}
