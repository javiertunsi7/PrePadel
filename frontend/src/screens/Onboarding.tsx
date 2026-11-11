import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { RiskChip } from '../components/Bits';
import { BackIcon, PainIcon, ProgramsIcon, TodayIcon, ZoneIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { PainScale } from '../components/PainScale';
import { ApiError } from '../lib/api';
import { DISCLAIMER, painRuleText } from '../lib/copy';
import { useScrollToTop } from '../lib/hooks';
import { useAppState, useStore } from '../lib/store';
import type { SkillLevel } from '../lib/types';
import { LEVEL_LABEL, zoneVars } from '../lib/zones';

type StepName = 'welcome' | 'about' | 'discomfort' | 'consent' | 'result';

const QUESTIONS: StepName[] = ['about', 'discomfort', 'consent'];

const MAX_WEEKLY_HOURS = 20;

const LEVELS: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/** Bienvenida y cuestionario inicial (2 minutos): genera el perfil de riesgo. */
export function Onboarding() {
  const store = useStore();
  const { content, me, offline } = useAppState();
  const navigate = useNavigate();
  // Quien ya tiene plan no repite el cuestionario; quien lo acaba de crear se queda a ver el resultado.
  const [alreadyRegistered] = useState(() => store.getState().me !== null);
  const [step, setStep] = useState<StepName>('welcome');
  const [age, setAge] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(3);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [discomfort, setDiscomfort] = useState<Record<string, number>>({});
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useScrollToTop(step);

  if (alreadyRegistered) {
    return <Navigate to="/" replace />;
  }

  const ageNumber = Number(age);
  const aboutReady = Number.isInteger(ageNumber) && ageNumber >= 18 && ageNumber <= 99 && level !== null;

  const submit = async () => {
    if (!content || level === null) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await store.register({
        age: ageNumber,
        weeklyHours,
        level,
        discomfort: Object.fromEntries(content.zones.map((zone) => [zone.code, discomfort[zone.code] ?? 0])),
        healthDataConsent: consent,
      });
      setStep('result');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No hay conexión. La primera vez necesitas internet para crear tu plan.',
      );
    } finally {
      setSending(false);
    }
  };

  if (step === 'welcome') {
    return (
      <main className="screen onboarding onboarding--welcome">
        <Mascot mood="happy" size={150} />
        <h1>Juega al pádel sin que te pase factura</h1>
        <p className="lead">
          Rutinas de 10 minutos para cuidar codo, hombro y rodilla. Hechas para jugadores amateur.
        </p>
        <ul className="perks">
          <li>
            <span className="perk perk--sun">
              <TodayIcon />
            </span>
            Calienta antes del partido y recupera después
          </li>
          <li>
            <span className="perk perk--mint">
              <ProgramsIcon />
            </span>
            Programa de 4 semanas para tu zona débil
          </li>
          <li>
            <span className="perk perk--coral">
              <PainIcon />
            </span>
            Registra el dolor con un toque y mira cómo evoluciona
          </li>
        </ul>
        <div className="sticky-cta">
          <button className="btn btn--primary btn--block btn--big" onClick={() => setStep('about')}>
            Empezar · 2 minutos
          </button>
        </div>
      </main>
    );
  }

  if (step === 'result' && me && content) {
    const recommended = content.programs.find((program) => program.slug === me.recommendedProgram);
    return (
      <main className="screen onboarding">
        <div className="onboarding__hero">
          <Mascot mood="cheer" size={110} />
          <h1>Tu punto de partida</h1>
          <p className="lead">Orientativo, según lo que nos has contado. No es un diagnóstico.</p>
        </div>
        <ul className="plain-list">
          {me.risk.map((risk) => {
            const zone = content.zones.find((candidate) => candidate.code === risk.zone);
            return (
              <li key={risk.zone} className="card row" style={zoneVars(risk.zone)}>
                <ZoneIcon zone={risk.zone} />
                <div className="row__text">
                  <strong>{zone?.name ?? risk.zone}</strong>
                  <span className="muted">{risk.reasons[0] ?? 'Sin molestias ahora mismo'}</span>
                </div>
                <RiskChip level={risk.level} />
              </li>
            );
          })}
        </ul>
        {recommended && (
          <section className="card card--zone recommend" style={zoneVars(recommended.zone)}>
            <span className="eyebrow">Te recomendamos empezar por</span>
            <h2>{recommended.name}</h2>
            <p>{recommended.summary}</p>
            <button
              className="btn btn--primary btn--block"
              onClick={() => {
                store.enroll(recommended.slug);
                navigate('/');
              }}
            >
              Empezar este programa
            </button>
          </section>
        )}
        <button className="btn btn--ghost btn--block" onClick={() => navigate('/')}>
          {recommended ? 'Ahora no, ver mi rutina de hoy' : 'Ver mi rutina de hoy'}
        </button>
      </main>
    );
  }

  const position = QUESTIONS.indexOf(step);

  return (
    <main className="screen onboarding">
      <header className="onboarding__bar">
        <button
          className="icon-btn"
          aria-label="Atrás"
          onClick={() => setStep(position <= 0 ? 'welcome' : QUESTIONS[position - 1])}
        >
          <BackIcon />
        </button>
        <div
          className="progress"
          role="progressbar"
          aria-label="Progreso del cuestionario"
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={position + 1}
        >
          {QUESTIONS.map((name, index) => (
            <span key={name} className={index <= position ? 'progress__step progress__step--on' : 'progress__step'} />
          ))}
        </div>
      </header>

      {step === 'about' && (
        <>
          <h1>Cuéntame sobre ti</h1>
          <label className="field">
            <span className="field__label">¿Cuántos años tienes?</span>
            <input
              className="input input--number"
              type="number"
              inputMode="numeric"
              min={18}
              max={99}
              placeholder="45"
              value={age}
              onChange={(event) => setAge(event.target.value)}
            />
          </label>
          <fieldset className="field">
            <legend className="field__label">¿Cuántas horas juegas a la semana?</legend>
            <div className="stepper">
              <button
                type="button"
                className="icon-btn"
                aria-label="Una hora menos"
                disabled={weeklyHours <= 0}
                onClick={() => setWeeklyHours((hours) => hours - 1)}
              >
                −
              </button>
              <output className="stepper__value" aria-live="polite">
                {weeklyHours} h
              </output>
              <button
                type="button"
                className="icon-btn"
                aria-label="Una hora más"
                disabled={weeklyHours >= MAX_WEEKLY_HOURS}
                onClick={() => setWeeklyHours((hours) => hours + 1)}
              >
                +
              </button>
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="field__label">¿Qué nivel tienes?</legend>
            <div className="choices">
              {LEVELS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="choice"
                  aria-pressed={level === option}
                  onClick={() => setLevel(option)}
                >
                  {LEVEL_LABEL[option]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="sticky-cta">
            <button
              className="btn btn--primary btn--block"
              disabled={!aboutReady}
              onClick={() => setStep('discomfort')}
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {step === 'discomfort' && (
        <>
          <h1>¿Notas alguna molestia?</h1>
          <p className="lead">De 0 (nada) a 10 (mucho). Si no te duele, déjalo en 0.</p>
          {!content && (
            <div className="card">
              <p>{offline ? 'No hay conexión. Hace falta internet para continuar.' : 'Cargando zonas…'}</p>
              {offline && (
                <button className="btn btn--secondary" onClick={() => void store.sync()}>
                  Reintentar
                </button>
              )}
            </div>
          )}
          {content?.zones.map((zone) => {
            const value = discomfort[zone.code] ?? 0;
            return (
              <section key={zone.code} className="card pain-card" style={zoneVars(zone.code)}>
                <header className="pain-card__head">
                  <ZoneIcon zone={zone.code} />
                  <h2>{zone.name}</h2>
                  <span className="pain-card__value">{value}/10</span>
                </header>
                <PainScale
                  value={value}
                  label={`Molestia en ${zone.name}`}
                  onSelect={(score) => setDiscomfort((current) => ({ ...current, [zone.code]: score }))}
                />
              </section>
            );
          })}
          <div className="sticky-cta">
            <button className="btn btn--primary btn--block" disabled={!content} onClick={() => setStep('consent')}>
              Siguiente
            </button>
          </div>
        </>
      )}

      {step === 'consent' && (
        <>
          <h1>Antes de empezar</h1>
          <section className="card">
            <h2>Esto es prevención, no tratamiento</h2>
            <p>{DISCLAIMER}</p>
            {content && <p>{painRuleText(content)}</p>}
          </section>
          <section className="card">
            <h2>Tus datos</h2>
            <p>
              No te pedimos nombre ni email. Guardamos tus respuestas y tu registro de dolor, que son datos de salud,
              para adaptar tu plan. Puedes borrarlos cuando quieras desde Perfil.
            </p>
            <label className="check">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>Doy mi consentimiento para que PrePádel guarde estos datos de salud.</span>
            </label>
          </section>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="sticky-cta">
            <button className="btn btn--primary btn--block" disabled={!consent || sending} onClick={() => void submit()}>
              {sending ? 'Creando tu plan…' : 'Crear mi plan'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
