// Shared configuration for API endpoints
module.exports = {
  // Model to use for all generation and review calls
  // Update this single value when upgrading to a new model version
  // Note: Fable 5 does not accept temperature/top_p/top_k (returns 400).
  // Quality is steered via adaptive thinking + prompting instead.
  MODEL: "claude-fable-5",
};
