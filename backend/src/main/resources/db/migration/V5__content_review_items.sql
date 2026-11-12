-- Revision del contenido por el fisioterapeuta, pieza a pieza: cada ejercicio,
-- rutina, programa y regla. content_hash es la huella del contenido tal como
-- estaba al revisarlo: si una migracion posterior lo cambia, la aprobacion deja
-- de valer y la app vuelve a decir "borrador".
create table review_item (
    item_key      varchar(120)  primary key,
    status        varchar(20)   not null,
    comment       varchar(1000),
    content_hash  varchar(64)   not null,
    reviewed_at   timestamp with time zone not null
);
