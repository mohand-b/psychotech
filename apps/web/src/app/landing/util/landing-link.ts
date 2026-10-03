import { Params } from '@angular/router';
import { LandingSectionId } from './landing-sections';

export const LANDING_ROUTE = {
  register: '/register',
  login: '/login',
  dashboard: '/dashboard',
  trainings: '/entrainements',
  pricing: '/tarifs',
  guide: '/guide',
} as const;

export type LandingLink =
  | { route: string; queryParams?: Params }
  | { section: LandingSectionId };

export interface LandingAction {
  label: string;
  link: LandingLink;
}

const SIGNUP_ACTION: LandingAction = {
  label: 'Commencer gratuitement',
  link: { route: LANDING_ROUTE.register },
};

const RESUME_ACTION: LandingAction = {
  label: 'Continuer ma préparation',
  link: { route: LANDING_ROUTE.dashboard },
};

export function resolveLandingPrimaryAction(
  authenticated: boolean,
): LandingAction {
  return authenticated ? RESUME_ACTION : SIGNUP_ACTION;
}
