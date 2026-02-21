// Shared configuration for API endpoints
module.exports = {
  // Model to use for all generation and review calls
  // Update this single value when upgrading to a new model version
  MODEL: "claude-opus-4-20250514",

  // Temperature settings (lower = more deterministic, fewer hallucinations)
  GENERATION_TEMPERATURE: 0.7,
  REVIEW_TEMPERATURE: 0.3,
  FIX_TEMPERATURE: 0.3,
};
