-- Aviso del partido con la app cerrada: hora del partido y la suscripcion de
-- notificaciones del movil del jugador (una por jugador). Se borra en cascada
-- con el jugador y, pasado el partido, lo limpia el servidor.
create table match_reminder (
    player_id  uuid          primary key references player (id) on delete cascade,
    endpoint   varchar(1000) not null,
    p256dh     varchar(120)  not null,
    auth       varchar(40)   not null,
    match_at   timestamp with time zone not null,
    sent_at    timestamp with time zone
);

create index idx_reminder_match on match_reminder (match_at);
