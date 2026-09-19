import type { CardDetails, IrctcConfig } from '../types/config.js';

export type SetupStepId = 'login' | 'journey' | 'passengers' | 'payment';

export type SetupStep = {
  id: SetupStepId;
  label: string;
  done: boolean;
  hint: string;
};

export type SetupCompletion = {
  done: number;
  total: number;
  ready: boolean;
  steps: SetupStep[];
};

function isCardComplete(card?: CardDetails): boolean {
  return !!(card?.name && card?.number && card?.expiry && card?.cvv);
}

export function getSetupSteps(config: IrctcConfig): SetupStep[] {
  const credentials = config.credentials || {};
  const journey = config.journey || {};
  const passengers = config.passengers || [];
  const preferences = config.preferences || {};

  const loginDone = !!(credentials.username?.trim() && credentials.password);
  const journeyDone = !!(
    journey.from?.trim() &&
    journey.to?.trim() &&
    journey.date &&
    (journey.trainNo?.trim() || journey.trainName?.trim())
  );
  const passengersDone = passengers.some((p) => (p.name || '').trim() && (p.age || '').trim() && p.gender);
  const paymentDone =
    !preferences.autoPayEnabled ||
    preferences.paymentMethod !== 'cards' ||
    (preferences.autoPayType === 'credit'
      ? isCardComplete(preferences.creditCard)
      : isCardComplete(preferences.debitCard));

  return [
    {
      id: 'login',
      label: 'Login',
      done: loginDone,
      hint: loginDone ? 'IRCTC credentials saved' : 'Add username and password'
    },
    {
      id: 'journey',
      label: 'Journey',
      done: journeyDone,
      hint: journeyDone ? `${journey.from} → ${journey.to}` : 'Stations, date, and train'
    },
    {
      id: 'passengers',
      label: 'Passengers',
      done: passengersDone,
      hint: passengersDone
        ? `${passengers.filter((p) => p.name?.trim()).length} passenger(s)`
        : 'At least one complete passenger'
    },
    {
      id: 'payment',
      label: 'Payment',
      done: paymentDone,
      hint: preferences.autoPayEnabled ? 'Auto-pay configured' : 'Manual payment (optional)'
    }
  ];
}

export function getSetupCompletion(config: IrctcConfig): SetupCompletion {
  const steps = getSetupSteps(config);
  const done = steps.filter((step) => step.done).length;
  const ready = steps.filter((step) => step.id !== 'payment').every((step) => step.done);
  return { done, total: steps.length, ready, steps };
}
