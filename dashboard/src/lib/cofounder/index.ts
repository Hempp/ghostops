// Co-Founder Memory and Learning System
// Re-exports all public APIs from the memory and learning modules

export {
  // Types
  type Decision,
  type LearnedPreference,
  type DecisionFilters,
  type DecisionType,
  type PreferenceCategory,
  // Constants
  DECISION_TYPES,
  PREFERENCE_CATEGORIES,
  // Decision functions
  logDecision,
  recordOutcome,
  recordFeedback,
  getDecision,
  getDecisionHistory,
  // Preference functions
  getLearnedPreferences,
  getPreferencesByCategory,
  updatePreference,
  decreasePreferenceConfidence,
  forgetPreference,
  resetCategoryPreferences
} from './memory'

export {
  // Types
  type FeedbackAnalysis,
  type PatternMatch,
  type PreferenceUpdate,
  type LearningInsight,
  // Learning functions
  processFeedback,
  generateLearningInsights,
  getPreferenceSummaryForAI,
  checkDecisionAlignment
} from './learning'
