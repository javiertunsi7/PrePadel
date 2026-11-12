-- Partido que se repite cada semana el mismo dia y a la misma hora. time_zone
-- (por ejemplo Europe/Madrid) mantiene la hora de reloj al cambiar el horario de verano.
alter table match_reminder add column weekly boolean not null default false;
alter table match_reminder add column time_zone varchar(60);
