export function calculateCurrentMilkStock(pumping = [], feedings = []) {
  const pumped = pumping.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const bottled = feedings
    .filter((entry) => entry.type === "breast milk" && entry.method === "bottle")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return pumped - bottled;
}
