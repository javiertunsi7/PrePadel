-- Rutinas que el jugador deja a medias con el boton "Salir": en que ejercicio estaba.
-- Sirve para saber donde se abandona. Se borra en cascada con el jugador.
create table routine_abandonment (
    id             uuid        primary key,
    player_id      uuid        not null references player (id) on delete cascade,
    routine_slug   varchar(80) not null references routine (slug),
    exercise_slug  varchar(80) not null references exercise (slug),
    abandoned_at   timestamp with time zone not null
);

create index idx_abandonment_player on routine_abandonment (player_id);
create index idx_abandonment_when on routine_abandonment (abandoned_at);
