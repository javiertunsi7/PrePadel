import { NavLink } from 'react-router';
import { PainIcon, ProfileIcon, ProgramsIcon, TodayIcon } from './Icons';

const TABS = [
  { to: '/', label: 'Hoy', icon: <TodayIcon />, end: true },
  { to: '/programas', label: 'Programas', icon: <ProgramsIcon />, end: false },
  { to: '/dolor', label: 'Dolor', icon: <PainIcon />, end: false },
  { to: '/perfil', label: 'Perfil', icon: <ProfileIcon />, end: false },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'tab tab--active' : 'tab')}
        >
          <span className="tab__icon">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
