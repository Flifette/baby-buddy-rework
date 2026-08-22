const DIRECT_BREASTFEEDING_METHODS = new Set([
  "left breast",
  "right breast",
  "both breasts",
]);

export function isDirectBreastfeeding(feedingOrMethod) {
  const method = typeof feedingOrMethod === "string"
    ? feedingOrMethod
    : feedingOrMethod?.method;
  return DIRECT_BREASTFEEDING_METHODS.has(method);
}

export function measurableFeedingAmount(feeding) {
  if (isDirectBreastfeeding(feeding)) return 0;
  return Number(feeding?.amount || 0);
}

export function feedingAmountForPayload(method, amount) {
  if (isDirectBreastfeeding(method)) return null;
  return Number(amount);
}
