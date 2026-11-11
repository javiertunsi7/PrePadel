import { Link } from 'react-router';
import { RiskChip } from '../components/Bits';
import { ChevronIcon, ZoneIcon } from '../components/Icons';
import { useAppState } from '../lib/store';
import { zoneVars } from '../lib/zones';

/** Programas de 4 semanas por zona. */
export function Programs() {
  const { content, me } = useAppState();
  if (!content || !me) {
    return null;
  }
  const enrollment = me.enrollment;

  return (
    <>
      <h1>Programas</h1>
      <p className="lead">
        Cuatro semanas, tres sesiones cortas por semana y carga progresiva. Elige la zona que quieres reforzar.
      </p>
      {content.programs.map((program) => {
        const zone = content.zones.find((candidate) => candidate.code === program.zone);
        const risk = me.risk.find((candidate) => candidate.zone === program.zone);
        const active = enrollment?.programSlug === program.slug;
        return (
          <Link
            key={program.slug}
            to={`/programas/${program.slug}`}
            className="card card--link card--zone program-card"
            style={zoneVars(program.zone)}
          >
            <div className="row row--flush">
              <ZoneIcon zone={program.zone} size={56} />
              <div className="row__text">
                <span className="eyebrow">{zone?.name ?? program.zone}</span>
                <strong className="program-card__name">{program.name}</strong>
                <span className="muted">{zone?.tagline}</span>
              </div>
              <ChevronIcon />
            </div>
            <div className="chips">
              {active && enrollment && (
                <span className="chip chip--done">
                  {enrollment.completed ? 'Completado' : `En curso · semana ${enrollment.currentWeek}`}
                </span>
              )}
              {!active && me.recommendedProgram === program.slug && (
                <span className="chip chip--sun">Recomendado para ti</span>
              )}
              {risk && <RiskChip level={risk.level} />}
            </div>
          </Link>
        );
      })}
    </>
  );
}
