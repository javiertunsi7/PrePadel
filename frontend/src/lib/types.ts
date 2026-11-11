// Tipos de la API del backend (com.prepadel.content.ContentResponse y com.prepadel.player.PlayerState).

export interface Zone {
  code: string;
  name: string;
  tagline: string;
}

export interface Step {
  order: number;
  exerciseSlug: string;
  name: string;
  zone: string | null;
  instructions: string;
  /** Frase corta que lee la voz en el modo manos libres. */
  voiceCue: string;
  equipment: string | null;
  /** A mitad de tiempo se avisa de cambiar de lado. */
  switchSides: boolean;
  videoUrl: string | null;
  durationSeconds: number;
  /** Descanso después del ejercicio. */
  restSeconds: number;
  dosage: string | null;
}

export type RoutineKind = 'WARMUP' | 'RECOVERY' | 'PROGRAM';

export interface Routine {
  slug: string;
  name: string;
  kind: RoutineKind;
  zone: string | null;
  summary: string;
  totalSeconds: number;
  equipment: string[];
  steps: Step[];
}

export interface ProgramWeek {
  week: number;
  title: string;
  focus: string;
  routineSlug: string;
}

export interface Program {
  slug: string;
  name: string;
  zone: string;
  summary: string;
  sessionsPerWeek: number;
  weeks: ProgramWeek[];
}

export interface Review {
  /** DRAFT mientras ningún profesional haya validado el contenido. */
  status: string;
  reviewerName: string | null;
  reviewerCredentials: string | null;
  reviewedOn: string | null;
}

export interface PainRule {
  consultScore: number;
  persistentScore: number;
  persistentDays: number;
}

export interface Content {
  zones: Zone[];
  routines: Routine[];
  programs: Program[];
  review: Review;
  painRule: PainRule;
}

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type PainContext = 'ONBOARDING' | 'POST_MATCH' | 'CHECK_IN';

export interface Profile {
  age: number;
  weeklyHours: number;
  level: SkillLevel;
  createdAt: string;
}

export interface ZoneRisk {
  zone: string;
  level: RiskLevel;
  score: number;
  lastPain: number | null;
  reasons: string[];
}

export interface Enrollment {
  programSlug: string;
  currentWeek: number;
  totalWeeks: number;
  sessionsDoneThisWeek: number;
  sessionsPerWeek: number;
  /** Rutina que toca en la semana actual. */
  routineSlug: string;
  completed: boolean;
  startedAt: string;
}

export interface Completion {
  id: string;
  routineSlug: string;
  completedAt: string;
}

export interface PainEntry {
  id: string;
  zone: string;
  score: number;
  context: PainContext;
  recordedAt: string;
}

export interface PainAlert {
  zone: string;
  kind: 'HIGH_PAIN' | 'PERSISTENT_PAIN';
  message: string;
}

export interface PlayerState {
  profile: Profile;
  risk: ZoneRisk[];
  recommendedProgram: string | null;
  enrollment: Enrollment | null;
  /** La más reciente primero. */
  recentCompletions: Completion[];
  /** El más reciente primero. */
  pain: PainEntry[];
  alerts: PainAlert[];
}

export interface OnboardingAnswers {
  age: number;
  weeklyHours: number;
  level: SkillLevel;
  /** Molestia actual de 0 a 10 por código de zona. */
  discomfort: Record<string, number>;
  healthDataConsent: boolean;
}
