const DEFAULT_PRICES = {
  flat_tire: 500,
  battery_dead: 300,
  engine_trouble: 1500,
  fuel_empty: 400,
  key_locked: 800,
  accident: 2500,
  overheating: 1200,
  brake_failure: 1800,
  transmission_issue: 3500,
  other: 1000
};

const getBasePrice = (issueType) => {
  return DEFAULT_PRICES[issueType] || DEFAULT_PRICES.other;
};

module.exports = {
  DEFAULT_PRICES,
  getBasePrice
};
