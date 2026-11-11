-- =====================================================================
-- Contenido inicial de PrePadel (BORRADOR).
-- Ejercicios generales de acondicionamiento y prevencion. Deben ser
-- revisados y firmados por un fisioterapeuta o preparador fisico antes
-- de publicar la app (ver tabla content_review).
-- =====================================================================

insert into content_review (id, status, reviewer_name, reviewer_credentials, reviewed_on)
values (1, 'DRAFT', null, null, null);

insert into body_zone (code, name, tagline, sort_order) values
('ELBOW',    'Codo',    'Antebrazo y agarre fuertes para el codo de pádel.',   1),
('SHOULDER', 'Hombro',  'Manguito y escápula listos para bandejas y remates.', 2),
('KNEE',     'Rodilla', 'Piernas estables para arrancar, frenar y girar.',     3);

-- ---------------------------------------------------------------------
-- Ejercicios
-- switch_sides = true: a mitad de tiempo la voz avisa de cambiar de lado
-- ---------------------------------------------------------------------
insert into exercise (slug, name, zone_code, instructions, voice_cue, equipment, switch_sides) values
-- Generales
('marcha-activa', 'Marcha activa en el sitio', null,
 'Camina en el sitio subiendo las rodillas hasta la cadera y moviendo los brazos con energía. Empieza suave y sube el ritmo poco a poco.',
 'Marcha en el sitio. Rodillas arriba y brazos sueltos.', null, false),
('pasos-laterales', 'Pasos laterales de pista', null,
 'Rodillas flexionadas como en posición de espera. Da tres o cuatro pasos a un lado y vuelve, sin cruzar los pies.',
 'Pasos laterales. Rodillas flexionadas, sin cruzar los pies.', null, false),
('rotaciones-tronco', 'Rotaciones de tronco', null,
 'Pies al ancho de las caderas y la pala apoyada sobre los hombros. Gira el tronco a un lado y a otro de forma controlada, sin forzar el final del giro.',
 'Rotaciones de tronco. Gira suave a un lado y a otro.', null, false),
('golpes-sombra', 'Golpes en sombra', null,
 'Con la pala y sin bola, encadena derechas, reveses y bandejas. Empieza lento y termina cerca del ritmo de partido, con el agarre relajado.',
 'Golpes en sombra. Derecha, revés y bandeja, de menos a más.', 'Pala', false),
('respiracion-calma', 'Respiración de vuelta a la calma', null,
 'Camina despacio o quédate de pie. Toma aire por la nariz en cuatro tiempos y suéltalo por la boca en seis.',
 'Respira. Toma aire en cuatro tiempos y suéltalo en seis.', null, false),

-- Codo
('movilidad-muneca', 'Movilidad de muñeca y antebrazo', 'ELBOW',
 'Entrelaza las manos y dibuja ochos con las muñecas. Después abre y cierra los puños con fuerza moderada.',
 'Movilidad de muñecas. Dibuja ochos y abre y cierra los puños.', null, false),
('isometrico-extensores', 'Isométrico de extensores de muñeca', 'ELBOW',
 'Apoya el antebrazo en el muslo con la palma hacia abajo. Con la otra mano empuja el dorso hacia abajo mientras resistes sin moverte durante diez segundos. Fuerza media y sin dolor agudo.',
 'Isométrico de muñeca. Empuja y resiste diez segundos sin moverte.', null, true),
('excentrico-extensores', 'Bajada lenta de muñeca con peso', 'ELBOW',
 'Antebrazo apoyado y palma hacia abajo con una botella de agua. Sube la mano ayudándote con la otra y bájala sola muy despacio, contando cuatro segundos.',
 'Bajada lenta de muñeca. Sube con ayuda y baja sola en cuatro segundos.', 'Botella de agua o mancuerna ligera', true),
('flexion-muneca-peso', 'Flexión de muñeca con peso', 'ELBOW',
 'Antebrazo apoyado y palma hacia arriba con una botella de agua. Sube y baja la mano de forma lenta y controlada.',
 'Flexión de muñeca. Palma arriba, sube y baja despacio.', 'Botella de agua o mancuerna ligera', true),
('pronosupinacion-pala', 'Giros de antebrazo con pala', 'ELBOW',
 'Codo pegado al cuerpo y doblado a noventa grados, sujetando la pala por el puño. Gira la palma hacia arriba y hacia abajo lentamente.',
 'Giros de antebrazo con la pala. Palma arriba, palma abajo, lento.', 'Pala', true),
('apreton-pelota', 'Apretón de pelota', 'ELBOW',
 'Aprieta una pelota de pádel durante cinco segundos y suelta otros cinco. Fuerza media, sin llegar al temblor.',
 'Aprieta la pelota cinco segundos y suelta cinco.', 'Pelota de pádel', true),
('estiramiento-extensores', 'Estiramiento de extensores del antebrazo', 'ELBOW',
 'Brazo estirado al frente con la palma hacia abajo. Con la otra mano lleva los dedos hacia ti hasta notar una tensión suave en la parte externa del antebrazo.',
 'Estira el antebrazo. Palma abajo y dedos hacia ti.', null, true),
('estiramiento-flexores', 'Estiramiento de flexores del antebrazo', 'ELBOW',
 'Brazo estirado al frente con la palma hacia arriba. Con la otra mano lleva los dedos hacia abajo hasta notar una tensión suave en la parte interna del antebrazo.',
 'Estira el antebrazo. Palma arriba y dedos hacia abajo.', null, true),

-- Hombro
('circulos-brazos', 'Círculos de brazos', 'SHOULDER',
 'Brazos estirados a los lados. Dibuja círculos pequeños y ve ampliándolos. La mitad del tiempo hacia delante y la otra mitad hacia atrás.',
 'Círculos de brazos. De pequeños a grandes.', null, false),
('deslizamiento-pared', 'Deslizamientos en pared', 'SHOULDER',
 'Espalda y antebrazos apoyados en la pared, con los codos a noventa grados. Desliza los brazos hacia arriba sin despegarlos y vuelve despacio.',
 'Deslizamientos en pared. Sube los brazos sin despegarlos.', null, false),
('isometrico-rotacion-externa', 'Isométrico de rotación externa', 'SHOULDER',
 'De lado a la pared, con el codo pegado al cuerpo y doblado a noventa grados. Empuja el dorso de la mano contra la pared durante diez segundos sin moverte.',
 'Isométrico de hombro. Empuja la pared con el dorso de la mano diez segundos.', null, true),
('rotacion-externa-banda', 'Rotación externa con banda', 'SHOULDER',
 'Codo pegado al costado y doblado a noventa grados, con la banda sujeta al otro lado. Gira el antebrazo hacia fuera sin despegar el codo y vuelve lento.',
 'Rotación externa con banda. Codo pegado y abre despacio.', 'Banda elástica', true),
('rotacion-interna-banda', 'Rotación interna con banda', 'SHOULDER',
 'Codo pegado al costado y doblado a noventa grados, con la banda anclada en tu mismo lado. Lleva la mano hacia el ombligo y vuelve lento.',
 'Rotación interna con banda. Mano al ombligo y vuelve lento.', 'Banda elástica', true),
('remo-banda', 'Remo con banda', 'SHOULDER',
 'Banda anclada a la altura del ombligo. Tira llevando los codos atrás y juntando las escápulas, aguanta un segundo y vuelve despacio.',
 'Remo con banda. Codos atrás y junta las escápulas.', 'Banda elástica', false),
('flexion-pared', 'Flexiones en pared', 'SHOULDER',
 'Manos en la pared a la altura del pecho. Haz una flexión y, al subir, empuja un poco más separando las escápulas.',
 'Flexiones en pared. Al subir, empuja un poco más.', null, false),
('ytw-de-pie', 'Y, T y W de pie', 'SHOULDER',
 'Inclínate un poco hacia delante con la espalda recta. Dibuja con los brazos una Y, una T y una W, apretando las escápulas dos segundos en cada posición.',
 'Y, T y W. Aprieta las escápulas en cada letra.', null, false),
('estiramiento-hombro-cruzado', 'Estiramiento cruzado de hombro', 'SHOULDER',
 'Cruza un brazo por delante del pecho y sujétalo con el otro. Mantén los hombros lejos de las orejas.',
 'Cruza el brazo por delante del pecho y sujétalo.', null, true),
('apertura-pecho', 'Apertura de pecho en pared', 'SHOULDER',
 'Apoya el antebrazo en la pared o en la valla con el codo a la altura del hombro y gira el cuerpo hacia fuera hasta notar el pecho abierto.',
 'Abre el pecho. Antebrazo en la pared y gira el cuerpo hacia fuera.', null, true),

-- Rodilla
('saltos-tobillo', 'Saltitos de tobillo', 'KNEE',
 'Saltos pequeños sobre la punta de los pies con las rodillas ligeramente flexionadas. Aterriza sin hacer ruido.',
 'Saltitos suaves. Aterriza sin ruido.', null, false),
('media-sentadilla', 'Media sentadilla', 'KNEE',
 'Pies al ancho de los hombros. Baja como si fueras a sentarte hasta medio recorrido y sube. Rodillas en línea con los pies.',
 'Media sentadilla. Baja con control y rodillas alineadas.', null, false),
('zancada-atras', 'Zancada atrás alterna', 'KNEE',
 'Da un paso largo hacia atrás y baja la rodilla trasera sin tocar el suelo. Alterna las piernas con el tronco erguido.',
 'Zancada atrás, alternando piernas. Tronco erguido.', null, false),
('zancada-lateral', 'Zancada lateral', 'KNEE',
 'Da un paso amplio hacia un lado y flexiona esa rodilla llevando la cadera atrás. Empuja para volver al centro y cambia de lado.',
 'Zancada lateral. Cadera atrás y empuja para volver.', null, false),
('sentadilla-pared', 'Sentadilla isométrica en pared', 'KNEE',
 'Espalda apoyada en la pared. Baja hasta un ángulo cómodo, sin llegar a noventa grados si molesta, y mantén la posición.',
 'Sentadilla en pared. Baja a un ángulo cómodo y aguanta.', null, false),
('puente-gluteo', 'Puente de glúteo', 'KNEE',
 'Tumbado boca arriba con las rodillas flexionadas. Eleva la cadera apretando los glúteos, mantén dos segundos y baja lento.',
 'Puente de glúteo. Sube la cadera, aprieta y baja lento.', null, false),
('sentadilla-silla', 'Sentadilla a silla', 'KNEE',
 'Siéntate y levántate de una silla o banco sin ayudarte con las manos. Tarda tres segundos en bajar.',
 'Sentadilla a silla. Baja en tres segundos y sube sin manos.', 'Silla o banco', false),
('pasos-banda', 'Pasos laterales con banda', 'KNEE',
 'Banda por encima de las rodillas y posición de media sentadilla. Da pasos laterales sin perder la tensión de la banda.',
 'Pasos laterales con banda. Mantén la tensión.', 'Banda elástica', false),
('subida-escalon', 'Subida al escalón', 'KNEE',
 'Sube a un escalón o banco bajo con una pierna y baja despacio con control. La rodilla sigue la línea del pie.',
 'Subida al escalón. Sube y baja despacio con control.', 'Escalón o banco bajo', true),
('elevacion-talones', 'Elevación de talones', 'KNEE',
 'De pie, sube a las puntas de los pies, mantén un segundo y baja en tres segundos.',
 'Elevación de talones. Sube, aguanta y baja lento.', null, false),
('equilibrio-una-pierna', 'Equilibrio a una pierna', 'KNEE',
 'Mantente sobre una pierna con la rodilla ligeramente flexionada. Para hacerlo más difícil, mueve la pala alrededor del cuerpo.',
 'Equilibrio a una pierna. Rodilla ligeramente flexionada.', null, true),
('aterrizaje-suave', 'Salto y aterrizaje suave', 'KNEE',
 'Da un salto pequeño y aterriza en silencio con las rodillas flexionadas y alineadas. Haz una pausa de dos segundos entre saltos.',
 'Salto y aterrizaje suave. Cae en silencio con las rodillas flexionadas.', null, false),
('estiramiento-cuadriceps', 'Estiramiento de cuádriceps', 'KNEE',
 'De pie y sujeto a la valla, lleva un talón al glúteo agarrando el tobillo. Mantén las rodillas juntas.',
 'Estira el cuádriceps. Talón al glúteo.', null, true),
('estiramiento-isquios', 'Estiramiento de isquiotibiales', 'KNEE',
 'Apoya un talón delante con la pierna estirada e inclina el tronco desde la cadera con la espalda larga.',
 'Estira la parte de atrás del muslo. Espalda larga.', null, true),
('estiramiento-gemelo', 'Estiramiento de gemelos', 'KNEE',
 'Manos en la pared y una pierna atrás, con el talón en el suelo y la rodilla estirada. Lleva la cadera hacia delante.',
 'Estira el gemelo. Talón atrás pegado al suelo.', null, true);

-- ---------------------------------------------------------------------
-- Rutinas (todas duran entre 8 y 12 minutos: lo comprueba un test)
-- ---------------------------------------------------------------------
insert into routine (slug, name, kind, zone_code, summary) values
('calentamiento-prepartido', 'Calentamiento prepartido', 'WARMUP', null,
 'Sube pulsaciones, despierta codo, hombro y rodilla y llega al primer punto ya caliente.'),
('recuperacion-postpartido', 'Recuperación postpartido', 'RECOVERY', null,
 'Baja pulsaciones y suelta antebrazo, hombro y piernas antes de irte de la pista.'),

('codo-semana-1', 'Codo de pádel · Semana 1', 'PROGRAM', 'ELBOW',
 'Isométricos suaves y movilidad para empezar a cargar el antebrazo sin dolor.'),
('codo-semana-2', 'Codo de pádel · Semana 2', 'PROGRAM', 'ELBOW',
 'Primeras bajadas lentas con peso ligero.'),
('codo-semana-3', 'Codo de pádel · Semana 3', 'PROGRAM', 'ELBOW',
 'Más repeticiones, giros con la pala y trabajo de espalda.'),
('codo-semana-4', 'Codo de pádel · Semana 4', 'PROGRAM', 'ELBOW',
 'La fuerza pasa al gesto de golpeo con el agarre relajado.'),

('hombro-semana-1', 'Hombro de remate · Semana 1', 'PROGRAM', 'SHOULDER',
 'Movilidad y activación del manguito rotador sin carga.'),
('hombro-semana-2', 'Hombro de remate · Semana 2', 'PROGRAM', 'SHOULDER',
 'Rotaciones con banda elástica y primeros ejercicios de espalda.'),
('hombro-semana-3', 'Hombro de remate · Semana 3', 'PROGRAM', 'SHOULDER',
 'Más trabajo de la musculatura que sujeta la escápula.'),
('hombro-semana-4', 'Hombro de remate · Semana 4', 'PROGRAM', 'SHOULDER',
 'La fuerza pasa al gesto de bandeja y remate.'),

('rodilla-semana-1', 'Rodilla estable · Semana 1', 'PROGRAM', 'KNEE',
 'Isométricos y glúteo para dar soporte a la rodilla.'),
('rodilla-semana-2', 'Rodilla estable · Semana 2', 'PROGRAM', 'KNEE',
 'Sentadillas a silla y trabajo lateral con banda.'),
('rodilla-semana-3', 'Rodilla estable · Semana 3', 'PROGRAM', 'KNEE',
 'Subidas al escalón y zancadas para ganar control a una pierna.'),
('rodilla-semana-4', 'Rodilla estable · Semana 4', 'PROGRAM', 'KNEE',
 'Desplazamientos laterales y aterrizajes como en un punto real.');

-- ---------------------------------------------------------------------
-- Pasos de cada rutina: ejercicio, segundos de trabajo, segundos de
-- descanso posterior y dosis orientativa.
-- ---------------------------------------------------------------------
insert into routine_step (routine_slug, step_order, exercise_slug, duration_seconds, rest_seconds, dosage) values
-- Calentamiento prepartido (9 min 35 s)
('calentamiento-prepartido', 1, 'marcha-activa',     60, 10, null),
('calentamiento-prepartido', 2, 'pasos-laterales',   60, 10, null),
('calentamiento-prepartido', 3, 'circulos-brazos',   45, 10, null),
('calentamiento-prepartido', 4, 'rotaciones-tronco', 45, 10, null),
('calentamiento-prepartido', 5, 'movilidad-muneca',  45, 10, null),
('calentamiento-prepartido', 6, 'media-sentadilla',  60, 10, '12 repeticiones a tu ritmo'),
('calentamiento-prepartido', 7, 'zancada-atras',     60, 10, '6 por pierna'),
('calentamiento-prepartido', 8, 'saltos-tobillo',    40, 15, null),
('calentamiento-prepartido', 9, 'golpes-sombra',     75,  0, 'Del 40 % al 80 % del ritmo de partido'),

-- Recuperación postpartido (8 min 35 s)
('recuperacion-postpartido', 1, 'respiracion-calma',           60, 5, null),
('recuperacion-postpartido', 2, 'estiramiento-extensores',     60, 5, '30 segundos por brazo'),
('recuperacion-postpartido', 3, 'estiramiento-flexores',       60, 5, '30 segundos por brazo'),
('recuperacion-postpartido', 4, 'estiramiento-hombro-cruzado', 60, 5, '30 segundos por brazo'),
('recuperacion-postpartido', 5, 'apertura-pecho',              60, 5, '30 segundos por lado'),
('recuperacion-postpartido', 6, 'estiramiento-cuadriceps',     60, 5, '30 segundos por pierna'),
('recuperacion-postpartido', 7, 'estiramiento-isquios',        60, 5, '30 segundos por pierna'),
('recuperacion-postpartido', 8, 'estiramiento-gemelo',         60, 0, '30 segundos por pierna'),

-- Codo, semana 1: activar sin dolor (9 min 30 s)
('codo-semana-1', 1, 'movilidad-muneca',        60, 10, null),
('codo-semana-1', 2, 'isometrico-extensores',   90, 20, '4 empujes de 10 segundos por brazo'),
('codo-semana-1', 3, 'apreton-pelota',          60, 15, '3 apretones por mano'),
('codo-semana-1', 4, 'isometrico-extensores',   90, 20, '4 empujes de 10 segundos por brazo'),
('codo-semana-1', 5, 'deslizamiento-pared',     60, 15, '8 repeticiones lentas'),
('codo-semana-1', 6, 'estiramiento-extensores', 60, 10, '30 segundos por brazo'),
('codo-semana-1', 7, 'estiramiento-flexores',   60,  0, '30 segundos por brazo'),

-- Codo, semana 2: bajadas lentas (9 min 45 s)
('codo-semana-2', 1, 'movilidad-muneca',        45, 10, null),
('codo-semana-2', 2, 'isometrico-extensores',   60, 15, '3 empujes de 10 segundos por brazo'),
('codo-semana-2', 3, 'excentrico-extensores',   90, 20, '8 bajadas lentas por brazo'),
('codo-semana-2', 4, 'flexion-muneca-peso',     80, 20, '10 repeticiones por brazo'),
('codo-semana-2', 5, 'excentrico-extensores',   90, 20, '8 bajadas lentas por brazo'),
('codo-semana-2', 6, 'apreton-pelota',          60, 15, '3 apretones por mano'),
('codo-semana-2', 7, 'estiramiento-extensores', 60,  0, '30 segundos por brazo'),

-- Codo, semana 3: más carga (11 min 25 s)
('codo-semana-3', 1, 'movilidad-muneca',        45, 10, null),
('codo-semana-3', 2, 'excentrico-extensores',  100, 20, '10 bajadas lentas por brazo'),
('codo-semana-3', 3, 'pronosupinacion-pala',    70, 15, '10 giros por brazo'),
('codo-semana-3', 4, 'flexion-muneca-peso',     80, 20, '12 repeticiones por brazo'),
('codo-semana-3', 5, 'excentrico-extensores',  100, 20, '10 bajadas lentas por brazo'),
('codo-semana-3', 6, 'remo-banda',              60, 15, '12 repeticiones'),
('codo-semana-3', 7, 'apreton-pelota',          60, 10, '3 apretones por mano'),
('codo-semana-3', 8, 'estiramiento-extensores', 60,  0, '30 segundos por brazo'),

-- Codo, semana 4: volver a pegar (11 min 50 s)
('codo-semana-4', 1, 'movilidad-muneca',        45, 10, null),
('codo-semana-4', 2, 'excentrico-extensores',  100, 20, '10 bajadas lentas por brazo, con algo más de peso'),
('codo-semana-4', 3, 'pronosupinacion-pala',    75, 15, '12 giros por brazo'),
('codo-semana-4', 4, 'flexion-muneca-peso',     75, 20, '12 repeticiones por brazo'),
('codo-semana-4', 5, 'remo-banda',              75, 15, '15 repeticiones'),
('codo-semana-4', 6, 'rotacion-externa-banda',  80, 15, '10 por brazo'),
('codo-semana-4', 7, 'golpes-sombra',           90, 15, 'Al 60 % y con el agarre relajado'),
('codo-semana-4', 8, 'estiramiento-extensores', 60,  0, '30 segundos por brazo'),

-- Hombro, semana 1: movilidad y activación (9 min 45 s)
('hombro-semana-1', 1, 'circulos-brazos',             60, 10, null),
('hombro-semana-1', 2, 'deslizamiento-pared',         75, 15, '10 repeticiones lentas'),
('hombro-semana-1', 3, 'isometrico-rotacion-externa', 90, 20, '4 empujes de 10 segundos por brazo'),
('hombro-semana-1', 4, 'flexion-pared',               60, 15, '10 repeticiones'),
('hombro-semana-1', 5, 'isometrico-rotacion-externa', 90, 20, '4 empujes de 10 segundos por brazo'),
('hombro-semana-1', 6, 'estiramiento-hombro-cruzado', 60, 10, '30 segundos por brazo'),
('hombro-semana-1', 7, 'apertura-pecho',              60,  0, '30 segundos por lado'),

-- Hombro, semana 2: manguito con banda (10 min 50 s)
('hombro-semana-2', 1, 'circulos-brazos',             45, 10, null),
('hombro-semana-2', 2, 'deslizamiento-pared',         60, 15, '10 repeticiones'),
('hombro-semana-2', 3, 'rotacion-externa-banda',      90, 20, '12 por brazo'),
('hombro-semana-2', 4, 'remo-banda',                  75, 20, '15 repeticiones'),
('hombro-semana-2', 5, 'rotacion-externa-banda',      90, 20, '12 por brazo'),
('hombro-semana-2', 6, 'flexion-pared',               60, 15, '12 repeticiones'),
('hombro-semana-2', 7, 'estiramiento-hombro-cruzado', 60, 10, '30 segundos por brazo'),
('hombro-semana-2', 8, 'apertura-pecho',              60,  0, '30 segundos por lado'),

-- Hombro, semana 3: escápula fuerte (11 min 45 s)
('hombro-semana-3', 1, 'circulos-brazos',        45, 10, null),
('hombro-semana-3', 2, 'ytw-de-pie',             90, 20, '5 rondas de Y, T y W'),
('hombro-semana-3', 3, 'rotacion-externa-banda', 90, 20, '12 por brazo'),
('hombro-semana-3', 4, 'remo-banda',             75, 20, '15 repeticiones con pausa'),
('hombro-semana-3', 5, 'flexion-pared',          75, 15, '15 repeticiones'),
('hombro-semana-3', 6, 'ytw-de-pie',             75, 20, '4 rondas de Y, T y W'),
('hombro-semana-3', 7, 'rotacion-interna-banda', 75, 15, '10 por brazo'),
('hombro-semana-3', 8, 'apertura-pecho',         60,  0, '30 segundos por lado'),

-- Hombro, semana 4: por encima de la cabeza (11 min 30 s)
('hombro-semana-4', 1, 'circulos-brazos',             45, 10, null),
('hombro-semana-4', 2, 'deslizamiento-pared',         60, 10, '10 repeticiones'),
('hombro-semana-4', 3, 'rotacion-externa-banda',      90, 20, '15 por brazo'),
('hombro-semana-4', 4, 'ytw-de-pie',                  90, 20, '5 rondas de Y, T y W'),
('hombro-semana-4', 5, 'remo-banda',                  75, 15, '15 repeticiones'),
('hombro-semana-4', 6, 'rotacion-interna-banda',      75, 15, '12 por brazo'),
('hombro-semana-4', 7, 'golpes-sombra',               90, 15, 'Bandejas y remates al 60 %'),
('hombro-semana-4', 8, 'estiramiento-hombro-cruzado', 60,  0, '30 segundos por brazo'),

-- Rodilla, semana 1: activar y sostener (9 min 25 s)
('rodilla-semana-1', 1, 'marcha-activa',           60, 10, null),
('rodilla-semana-1', 2, 'sentadilla-pared',        45, 20, 'Aguanta lo que puedas, hasta 45 segundos'),
('rodilla-semana-1', 3, 'puente-gluteo',           75, 15, '12 repeticiones'),
('rodilla-semana-1', 4, 'sentadilla-pared',        45, 20, 'Aguanta lo que puedas, hasta 45 segundos'),
('rodilla-semana-1', 5, 'elevacion-talones',       60, 15, '12 repeticiones'),
('rodilla-semana-1', 6, 'equilibrio-una-pierna',   60, 10, '30 segundos por pierna'),
('rodilla-semana-1', 7, 'estiramiento-cuadriceps', 60, 10, '30 segundos por pierna'),
('rodilla-semana-1', 8, 'estiramiento-isquios',    60,  0, '30 segundos por pierna'),

-- Rodilla, semana 2: fuerza controlada (10 min 20 s)
('rodilla-semana-2', 1, 'marcha-activa',           45, 10, null),
('rodilla-semana-2', 2, 'sentadilla-silla',        75, 20, '10 repeticiones'),
('rodilla-semana-2', 3, 'puente-gluteo',           75, 15, '15 repeticiones'),
('rodilla-semana-2', 4, 'pasos-banda',             60, 20, '10 pasos a cada lado'),
('rodilla-semana-2', 5, 'sentadilla-silla',        75, 20, '10 repeticiones'),
('rodilla-semana-2', 6, 'elevacion-talones',       60, 15, '15 repeticiones'),
('rodilla-semana-2', 7, 'equilibrio-una-pierna',   60, 10, '30 segundos por pierna'),
('rodilla-semana-2', 8, 'estiramiento-cuadriceps', 60,  0, '30 segundos por pierna'),

-- Rodilla, semana 3: a una pierna (11 min 5 s)
('rodilla-semana-3', 1, 'marcha-activa',        45, 10, null),
('rodilla-semana-3', 2, 'subida-escalon',       90, 20, '8 por pierna'),
('rodilla-semana-3', 3, 'zancada-atras',        75, 20, '8 por pierna'),
('rodilla-semana-3', 4, 'pasos-banda',          60, 15, '12 pasos a cada lado'),
('rodilla-semana-3', 5, 'subida-escalon',       90, 20, '8 por pierna'),
('rodilla-semana-3', 6, 'puente-gluteo',        75, 15, '15 repeticiones con pausa arriba'),
('rodilla-semana-3', 7, 'elevacion-talones',    60, 10, '15 repeticiones'),
('rodilla-semana-3', 8, 'estiramiento-isquios', 60,  0, '30 segundos por pierna'),

-- Rodilla, semana 4: frenar y arrancar (11 min 55 s)
('rodilla-semana-4', 1, 'pasos-laterales',         60, 10, null),
('rodilla-semana-4', 2, 'media-sentadilla',        60, 15, '15 repeticiones'),
('rodilla-semana-4', 3, 'zancada-lateral',         75, 20, '6 por lado'),
('rodilla-semana-4', 4, 'subida-escalon',          90, 20, '10 por pierna'),
('rodilla-semana-4', 5, 'aterrizaje-suave',        60, 20, '8 saltos'),
('rodilla-semana-4', 6, 'pasos-banda',             60, 15, '12 pasos a cada lado'),
('rodilla-semana-4', 7, 'aterrizaje-suave',        60, 20, '8 saltos'),
('rodilla-semana-4', 8, 'equilibrio-una-pierna',   60, 10, '30 segundos por pierna'),
('rodilla-semana-4', 9, 'estiramiento-cuadriceps', 60,  0, '30 segundos por pierna');

-- ---------------------------------------------------------------------
-- Programas de 4 semanas por zona, con progresión de carga
-- ---------------------------------------------------------------------
insert into program (slug, name, zone_code, summary, sessions_per_week) values
('codo-de-padel', 'Codo de pádel', 'ELBOW',
 'Cuatro semanas para que el antebrazo aguante el agarre y los golpes: de isométricos suaves a carga progresiva y vuelta al gesto de juego.', 3),
('hombro-de-remate', 'Hombro de remate', 'SHOULDER',
 'Cuatro semanas para ganar movilidad y fuerza en manguito y escápula y hacer bandejas y remates sin que el hombro proteste.', 3),
('rodilla-estable', 'Rodilla estable', 'KNEE',
 'Cuatro semanas de fuerza de cuádriceps y glúteo, equilibrio y aterrizajes para arrancar y frenar con seguridad.', 3);

insert into program_week (program_slug, week_number, title, focus, routine_slug) values
('codo-de-padel', 1, 'Activar sin dolor', 'Isométricos suaves y movilidad para empezar a cargar el antebrazo.', 'codo-semana-1'),
('codo-de-padel', 2, 'Bajadas lentas',    'Introducimos el trabajo excéntrico con peso ligero.',                'codo-semana-2'),
('codo-de-padel', 3, 'Más carga',         'Más repeticiones, giros con la pala y trabajo de espalda.',          'codo-semana-3'),
('codo-de-padel', 4, 'Volver a pegar',    'Integramos la fuerza en el gesto de golpeo con el agarre relajado.', 'codo-semana-4'),

('hombro-de-remate', 1, 'Movilidad y activación',  'Recuperamos movimiento y despertamos el manguito rotador sin carga.', 'hombro-semana-1'),
('hombro-de-remate', 2, 'Manguito con banda',      'Rotaciones con banda elástica y primeros ejercicios de espalda.',     'hombro-semana-2'),
('hombro-de-remate', 3, 'Escápula fuerte',         'Más trabajo de la musculatura que sujeta la escápula.',               'hombro-semana-3'),
('hombro-de-remate', 4, 'Por encima de la cabeza', 'Llevamos la fuerza al gesto de bandeja y remate.',                    'hombro-semana-4'),

('rodilla-estable', 1, 'Activar y sostener', 'Isométricos y glúteo para dar soporte a la rodilla.',            'rodilla-semana-1'),
('rodilla-estable', 2, 'Fuerza controlada',  'Sentadillas a silla y trabajo lateral con banda.',               'rodilla-semana-2'),
('rodilla-estable', 3, 'A una pierna',       'Subidas al escalón y zancadas para ganar control a una pierna.', 'rodilla-semana-3'),
('rodilla-estable', 4, 'Frenar y arrancar',  'Desplazamientos laterales y aterrizajes como en un punto real.', 'rodilla-semana-4');
