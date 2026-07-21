import { AxisType } from '../enums';
import { RailwayPlayableAxis } from './axis-training';

export enum AxisCommandInput {
  POINTER = 'POINTER',
  KEYBOARD = 'KEYBOARD',
  TOUCH = 'TOUCH',
  PHONE_GAMEPAD = 'PHONE_GAMEPAD',
}

export interface AxisCommandLine {
  input: AxisCommandInput;
  text: string;
}

export const AXIS_COMMANDS: Record<RailwayPlayableAxis, AxisCommandLine[]> = {
  [AxisType.LOGIC]: [
    {
      input: AxisCommandInput.POINTER,
      text: 'Clic sur les propositions ou sur le pavé de saisie.',
    },
    {
      input: AxisCommandInput.KEYBOARD,
      text: 'Clavier : A à D ou 1 à 4 pour les choix, 0 à 6 pour les faces de domino, chiffres pour les triangles.',
    },
  ],
  [AxisType.MEMORY]: [
    {
      input: AxisCommandInput.POINTER,
      text: 'Clic sur le pavé chiffré, avec Passer pour un emplacement oublié.',
    },
    {
      input: AxisCommandInput.KEYBOARD,
      text: 'Clavier : chiffres 0 à 9, P passe un emplacement, Retour efface, Entrée valide.',
    },
  ],
  [AxisType.VISUAL_DISCRIMINATION]: [
    {
      input: AxisCommandInput.POINTER,
      text: 'Clic sur Identique ou Différent.',
    },
    {
      input: AxisCommandInput.KEYBOARD,
      text: 'Clavier : flèche gauche pour identique, flèche droite pour différent.',
    },
  ],
  [AxisType.REACTIVITY]: [
    {
      input: AxisCommandInput.KEYBOARD,
      text: 'Clavier : flèche gauche, flèche droite ou barre espace selon le signal.',
    },
    {
      input: AxisCommandInput.TOUCH,
      text: "Sur mobile : boutons tactiles affichés à l'écran.",
    },
  ],
  [AxisType.MOTOR_SKILLS]: [
    {
      input: AxisCommandInput.POINTER,
      text: 'Sur ordinateur : deux manivelles pilotées à la souris.',
    },
    {
      input: AxisCommandInput.PHONE_GAMEPAD,
      text: 'Sur mobile : votre téléphone sert de manette après association.',
    },
  ],
};
