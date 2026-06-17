import {
  buildWizardSteps,
  hasMatchedDestination,
  legProgressLabel,
  primaryQuestionForStep,
} from '../newTripFlow';

describe('new trip wizard flow copy', () => {
  it('starts by asking whether the trip has one stop or multiple destinations', () => {
    const steps = buildWizardSteps(false);

    expect(steps[0]).toBe('Trip Type');
    expect(primaryQuestionForStep(steps[0], false, 1)).toBe('Is this one destination or a multi-stop trip?');
  });

  it('uses route-focused labels for multi-leg destination entry', () => {
    const steps = buildWizardSteps(true);

    expect(steps.slice(0, 5)).toEqual(['Trip Type', 'Stop', 'Dates', 'Transport', 'Stay']);
    expect(primaryQuestionForStep('Stop', true, 2)).toBe('Where is stop 2?');
    expect(primaryQuestionForStep('Transport', true, 2)).toBe('How do you get to stop 2?');
    expect(primaryQuestionForStep('Stay', true, 2)).toBe('Where will you stay at stop 2?');
    expect(legProgressLabel(1, 2)).toBe('Stop 2 of your route');
  });

  it('requires destination text to match a selected place with coordinates', () => {
    expect(hasMatchedDestination({
      query: 'Munich',
      destination: 'Munich',
      latitude: undefined,
      longitude: undefined,
    })).toBe(false);

    expect(hasMatchedDestination({
      query: 'Munich',
      destination: 'Munich, Bavaria, Germany',
      latitude: 48.1374,
      longitude: 11.5755,
    })).toBe(false);

    expect(hasMatchedDestination({
      query: 'Munich, Bavaria, Germany',
      destination: 'Munich, Bavaria, Germany',
      latitude: 48.1374,
      longitude: 11.5755,
    })).toBe(true);
  });
});
