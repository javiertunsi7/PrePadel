package com.prepadel;

import java.time.Clock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PrepadelApplication {

	private static final String SOCKET_DIR_PROPERTY = "jdk.net.unixdomain.tmpdir";

	public static void main(String[] args) {
		useAsciiSocketDirOnWindows();
		SpringApplication.run(PrepadelApplication.class, args);
	}

	/**
	 * En Windows el JDK crea un socket temporal dentro de la carpeta del usuario
	 * y falla ("Unable to establish loopback connection") si esa ruta tiene
	 * caracteres no ASCII, como la ñ o una tilde en el nombre de usuario: el
	 * servidor web no llega a arrancar. Se evita llevando esos sockets a la
	 * carpeta temporal de Windows. En Linux o macOS no hace nada.
	 */
	private static void useAsciiSocketDirOnWindows() {
		boolean windows = System.getProperty("os.name", "").startsWith("Windows");
		boolean asciiHome = System.getProperty("user.home", "").chars().allMatch(character -> character < 128);
		if (windows && !asciiHome && System.getProperty(SOCKET_DIR_PROPERTY) == null) {
			String windowsDir = System.getenv().getOrDefault("SystemRoot", "C:\\Windows");
			System.setProperty(SOCKET_DIR_PROPERTY, windowsDir + "\\Temp");
		}
	}

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

}
