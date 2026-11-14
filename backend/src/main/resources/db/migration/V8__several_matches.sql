-- Varios partidos por jugador (por ejemplo, martes y jueves), cada uno con su aviso.
-- La clave pasa de player_id a (player_id, id); el id de cada partido lo pone el movil.
-- El aviso que ya hubiera se conserva con el uuid nulo: es el id con el que lo conoce
-- la app al actualizarse, y el que usa la ruta antigua POST /api/me/reminder.
-- Se crea la tabla nueva y se copian los avisos porque quitar una clave primaria se
-- escribe distinto en H2 y en PostgreSQL.
create table match_reminder_v8 (
    player_id  uuid          not null references player (id) on delete cascade,
    id         uuid          not null,
    endpoint   varchar(1000) not null,
    p256dh     varchar(120)  not null,
    auth       varchar(40)   not null,
    match_at   timestamp with time zone not null,
    sent_at    timestamp with time zone,
    weekly     boolean       not null default false,
    time_zone  varchar(60),
    constraint pk_match_reminder primary key (player_id, id)
);

insert into match_reminder_v8 (player_id, id, endpoint, p256dh, auth, match_at, sent_at, weekly, time_zone)
select player_id, cast('00000000-0000-0000-0000-000000000000' as uuid), endpoint, p256dh, auth, match_at,
       sent_at, weekly, time_zone
from match_reminder;

drop table match_reminder;
alter table match_reminder_v8 rename to match_reminder;
create index idx_reminder_match on match_reminder (match_at);
