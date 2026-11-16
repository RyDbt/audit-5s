import type { ChecklistAnswer } from './types';

/** Score de conformité en % (arrondi), ou undefined si aucune réponse. */
export function checklistScore(answers: ChecklistAnswer[]): number | undefined {
  if (answers.length === 0) return undefined;
  const yes = answers.filter((a) => a.answer === 'yes').length;
  return Math.round((yes / answers.length) * 100);
}
