// src/validation/setupProgress.ts
function isCardComplete(card) {
  return !!(card?.name && card?.number && card?.expiry && card?.cvv);
}
function getSetupSteps(config) {
  const credentials = config.credentials || {};
  const journey = config.journey || {};
  const passengers = config.passengers || [];
  const preferences = config.preferences || {};
  const loginDone = !!(credentials.username?.trim() && credentials.password);
  const journeyDone = !!(journey.from?.trim() && journey.to?.trim() && journey.date && (journey.trainNo?.trim() || journey.trainName?.trim()));
  const passengersDone = passengers.some((p) => (p.name || "").trim() && (p.age || "").trim() && p.gender);
  const paymentDone = !preferences.autoPayEnabled || preferences.paymentMethod !== "cards" || (preferences.autoPayType === "credit" ? isCardComplete(preferences.creditCard) : isCardComplete(preferences.debitCard));
  return [
    {
      id: "login",
      label: "Login",
      done: loginDone,
      hint: loginDone ? "IRCTC credentials saved" : "Add username and password"
    },
    {
      id: "journey",
      label: "Journey",
      done: journeyDone,
      hint: journeyDone ? `${journey.from} \u2192 ${journey.to}` : "Stations, date, and train"
    },
    {
      id: "passengers",
      label: "Passengers",
      done: passengersDone,
      hint: passengersDone ? `${passengers.filter((p) => p.name?.trim()).length} passenger(s)` : "At least one complete passenger"
    },
    {
      id: "payment",
      label: "Payment",
      done: paymentDone,
      hint: preferences.autoPayEnabled ? "Auto-pay configured" : "Manual payment (optional)"
    }
  ];
}
function getSetupCompletion(config) {
  const steps = getSetupSteps(config);
  const done = steps.filter((step) => step.done).length;
  const ready = steps.filter((step) => step.id !== "payment").every((step) => step.done);
  return { done, total: steps.length, ready, steps };
}
export {
  getSetupCompletion,
  getSetupSteps
};
