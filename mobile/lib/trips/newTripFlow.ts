export type WizardStep = 'Trip Type' | 'Destination' | 'Stop' | 'Dates' | 'How' | 'Transport' | 'Stay' | 'Details';
export type TripRouteMode = 'single' | 'multi';

export function buildWizardSteps(isMultiLeg: boolean): WizardStep[] {
  return isMultiLeg
    ? ['Trip Type', 'Stop', 'Dates', 'Transport', 'Stay', 'Details']
    : ['Trip Type', 'Destination', 'Dates', 'How', 'Stay', 'Details'];
}

export function legProgressLabel(savedLegCount: number, currentLegNumber: number): string {
  return savedLegCount > 0 ? `Stop ${currentLegNumber} of your route` : 'First stop';
}

export function primaryQuestionForStep(step: WizardStep, isMultiLeg: boolean, currentLegNumber: number): string {
  switch (step) {
    case 'Trip Type':
      return 'Is this one destination or a multi-stop trip?';
    case 'Destination':
      return 'Where are you going?';
    case 'Stop':
      return isMultiLeg ? `Where is stop ${currentLegNumber}?` : 'Where are you going?';
    case 'Dates':
      return isMultiLeg ? `When are you at stop ${currentLegNumber}?` : 'When are you traveling?';
    case 'How':
      return 'How are you getting there?';
    case 'Transport':
      return isMultiLeg ? `How do you get to stop ${currentLegNumber}?` : 'How are you getting there?';
    case 'Stay':
      return isMultiLeg ? `Where will you stay at stop ${currentLegNumber}?` : 'Where are you staying?';
    case 'Details':
      return 'Almost done!';
    default:
      return '';
  }
}
