import { useState } from 'react';
import { Link } from 'react-router';
import { RiskChip } from '../components/Bits';
import { ZoneIcon } from '../components/Icons';
import { DISCLAIMER, painRuleText, reviewText } from '../lib/copy';
import { useAppState, useStore } from '../lib/store';
import { LEVEL_LABEL, zoneVars } from '../lib/zones';

/** Perfil: respuestas del cuestionario, riesgo por zona, ajustes y borrado de datos. */
export function Profile() {
  const store = useStore();
  const { content, me, settings, outbox } = useAppState();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  if (!content || !me) {
    return null;
  }

  const downloadData = async () => {
    setExporting(true);
    setError(null);
    try {
      const data = await store.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'prepadel-mis-datos.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se han podido descargar. Hace falta conexión: inténtalo cuando tengas cobertura.');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      // Al borrar, la app vuelve sola a la bienvenida (ya no hay jugador).
      await store.deleteAccount();
    } catch {
      setError('No se ha podido borrar. Hace falta conexión: inténtalo cuando tengas cobertura.');
      setDeleting(false);
    }
  };

  return (
    <>
      <h1>Tu perfil</h1>
      <section className="card">
        <dl className="facts">
          <div>
            <dt>Edad</dt>
            <dd>{me.profile.age} años</dd>
          </div>
          <div>
            <dt>Juegas</dt>
            <dd>{me.profile.weeklyHours} h/semana</dd>
          </div>
          <div>
            <dt>Nivel</dt>
            <dd>{LEVEL_LABEL[me.profile.level]}</dd>
          </div>
        </dl>
      </section>

      <h2 className="section-title">Riesgo por zona</h2>
      <ul className="plain-list">
        {me.risk.map((risk) => {
          const zone = content.zones.find((candidate) => candidate.code === risk.zone);
          return (
            <li key={risk.zone} className="card row" style={zoneVars(risk.zone)}>
              <ZoneIcon zone={risk.zone} />
              <div className="row__text">
                <strong>{zone?.name ?? risk.zone}</strong>
                <span className="muted">{risk.reasons.join(' · ') || 'Sin molestias ni carga destacable'}</span>
              </div>
              <RiskChip level={risk.level} />
            </li>
          );
        })}
      </ul>
      <p className="muted small">
        Orientativo: se calcula con tus respuestas y tu registro de dolor. No es un diagnóstico.
      </p>

      <h2 className="section-title">Ajustes</h2>
      <label className="card switch-row">
        <span className="row__text">
          <strong>Voz que te guía</strong>
          <span className="muted">Indicaciones habladas y pitidos durante la rutina</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={settings.voice}
          onChange={(event) => store.setVoice(event.target.checked)}
        />
      </label>

      <h2 className="section-title">Sobre PrePádel</h2>
      <section className="card">
        <p>
          <strong>{reviewText(content)}</strong>
        </p>
        <p>{DISCLAIMER}</p>
        <p>{painRuleText(content)}</p>
        <Link className="btn btn--secondary btn--block" to="/perfil/ejercicios">
          Ver todos los ejercicios
        </Link>
      </section>

      <h2 className="section-title">Tus datos</h2>
      <section className="card">
        <p>
          No guardamos tu nombre ni tu email. Solo tus respuestas del cuestionario, las rutinas que haces o dejas a
          medias, tu registro de dolor y, si pides el aviso, la hora de tu partido.
        </p>
        {outbox.length > 0 && (
          <p className="muted">
            {outbox.length === 1 ? 'Hay 1 cambio pendiente' : `Hay ${outbox.length} cambios pendientes`} de enviar al
            servidor.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="btn btn--secondary btn--block"
          disabled={exporting}
          onClick={() => void downloadData()}
        >
          {exporting ? 'Preparando…' : 'Descargar mis datos'}
        </button>
        {confirmingDelete ? (
          <div className="confirm">
            <p>Se borrará todo tu historial y no se puede deshacer.</p>
            <button className="btn btn--danger btn--block" disabled={deleting} onClick={() => void deleteAccount()}>
              {deleting ? 'Borrando…' : 'Sí, borrar mis datos'}
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="btn btn--secondary btn--block" onClick={() => setConfirmingDelete(true)}>
            Borrar mis datos
          </button>
        )}
      </section>
    </>
  );
}
