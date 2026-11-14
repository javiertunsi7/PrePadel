-- Club del que llega el jugador: abrió la app con el enlace que reparte su club (/?club=codigo).
-- Sirve para medir la retencion por club en el panel. Solo se guardan los codigos de
-- prepadel.clubs; sin enlace, o con un codigo que no esta ahi, queda vacio.
alter table player add column club_code varchar(40);
