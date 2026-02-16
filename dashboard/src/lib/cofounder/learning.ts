import {
  getDecisionHistory,
  getLearnedPreferences,
  updatePreference,
  decreasePreferenceConfidence,
  getDecision,
  Decision,
  LearnedPreference,
  DECISION_TYPES,
  PREFERENCE_CATEGORIES
} from './memory'

// ============================================================================
// Types
// ============================================================================

export interface FeedbackAnalysis {
  decisionId: string
  feedback: 'approved' | 'rejected' | 'modified'
  patternsDetected: PatternMatch[]
  preferencesUpdated: PreferenceUpdate[]
}

export interface PatternMatch {
  category: string
  pattern: string
  confidence: number
  examples: string[]
}

export interface PreferenceUpdate {
  category: string
  preference: string
  action: 'increase' | 'decrease' | 'create' | 'delete'
  oldConfidence?: number
  newConfidence?: number
}

export interface LearningInsight {
  category: string
  insight: string
  confidence: number
  basedOn: number // Number of decisions analyzed
}

// ============================================================================
// Core Learning Algorithm
// ============================================================================

/**
 * Analyze feedback and update learned preferences accordingly
 * This is the main learning function that processes owner feedback
 */
export async function processFeedback(
  businessId: string,
  decisionId: string,
  feedback: 'approved' | 'rejected' | 'modified'
): Promise<FeedbackAnalysis> {
  const decision = await getDecision(decisionId)
  if (!decision) {
    throw new Error('Decision not found')
  }

  const existingPreferences = await getLearnedPreferences(businessId)
  const patternsDetected: PatternMatch[] = []
  const preferencesUpdated: PreferenceUpdate[] = []

  // Extract patterns from the decision
  const patterns = extractPatterns(decision)

  for (const pattern of patterns) {
    patternsDetected.push(pattern)

    // Find matching preference
    const matchingPref = existingPreferences.find(
      p => p.category === pattern.category && p.preference === pattern.pattern
    )

    if (feedback === 'approved') {
      // Approval increases confidence in the pattern
      if (matchingPref) {
        const newConfidence = Math.min(matchingPref.confidence + 0.1, 1.0)
        await updatePreference(
          businessId,
          pattern.category,
          pattern.pattern,
          newConfidence,
          pattern.examples
        )
        preferencesUpdated.push({
          category: pattern.category,
          preference: pattern.pattern,
          action: 'increase',
          oldConfidence: matchingPref.confidence,
          newConfidence
        })
      } else {
        // Create new preference with low initial confidence
        await updatePreference(
          businessId,
          pattern.category,
          pattern.pattern,
          0.3,
          pattern.examples
        )
        preferencesUpdated.push({
          category: pattern.category,
          preference: pattern.pattern,
          action: 'create',
          newConfidence: 0.3
        })
      }
    } else if (feedback === 'rejected') {
      // Rejection decreases confidence or removes the pattern
      if (matchingPref) {
        const newConfidence = Math.max(matchingPref.confidence - 0.25, 0)
        if (newConfidence === 0) {
          await decreasePreferenceConfidence(matchingPref.id, matchingPref.confidence)
          preferencesUpdated.push({
            category: pattern.category,
            preference: pattern.pattern,
            action: 'delete',
            oldConfidence: matchingPref.confidence
          })
        } else {
          await decreasePreferenceConfidence(matchingPref.id, 0.25)
          preferencesUpdated.push({
            category: pattern.category,
            preference: pattern.pattern,
            action: 'decrease',
            oldConfidence: matchingPref.confidence,
            newConfidence
          })
        }
      }
      // For rejected patterns, create an "avoid" preference
      const avoidPattern = `avoid:${pattern.pattern}`
      await updatePreference(
        businessId,
        pattern.category,
        avoidPattern,
        0.4,
        [`Rejected: ${decision.decision.substring(0, 100)}`]
      )
      preferencesUpdated.push({
        category: pattern.category,
        preference: avoidPattern,
        action: 'create',
        newConfidence: 0.4
      })
    } else if (feedback === 'modified') {
      // Modified suggests partial alignment - small confidence adjustment
      if (matchingPref) {
        const newConfidence = Math.max(matchingPref.confidence - 0.05, 0.1)
        await updatePreference(
          businessId,
          pattern.category,
          pattern.pattern,
          newConfidence
        )
        preferencesUpdated.push({
          category: pattern.category,
          preference: pattern.pattern,
          action: 'decrease',
          oldConfidence: matchingPref.confidence,
          newConfidence
        })
      }
    }
  }

  return {
    decisionId,
    feedback,
    patternsDetected,
    preferencesUpdated
  }
}

/**
 * Extract patterns from a decision for learning
 */
function extractPatterns(decision: Decision): PatternMatch[] {
  const patterns: PatternMatch[] = []

  // Analyze decision type patterns
  if (decision.type === DECISION_TYPES.MESSAGE_RESPONSE) {
    // Extract communication style patterns
    const style = analyzeMessageStyle(decision.decision)
    if (style) {
      patterns.push({
        category: PREFERENCE_CATEGORIES.COMMUNICATION_STYLE,
        pattern: style,
        confidence: 0.5,
        examples: [decision.decision.substring(0, 200)]
      })
    }

    // Extract tone patterns
    const tone = analyzeTone(decision.decision)
    if (tone) {
      patterns.push({
        category: PREFERENCE_CATEGORIES.TONE,
        pattern: tone,
        confidence: 0.5,
        examples: [decision.decision.substring(0, 200)]
      })
    }

    // Extract response length preference
    const length = analyzeLength(decision.decision)
    patterns.push({
      category: PREFERENCE_CATEGORIES.RESPONSE_LENGTH,
      pattern: length,
      confidence: 0.5,
      examples: [`${decision.decision.length} characters`]
    })
  }

  if (decision.type === DECISION_TYPES.PRICING_SUGGESTION) {
    // Extract pricing patterns from context
    const pricingPattern = analyzePricingPattern(decision)
    if (pricingPattern) {
      patterns.push({
        category: PREFERENCE_CATEGORIES.PRICING,
        pattern: pricingPattern,
        confidence: 0.5,
        examples: [decision.decision.substring(0, 200)]
      })
    }
  }

  if (decision.type === DECISION_TYPES.LEAD_FOLLOWUP) {
    // Extract timing and urgency patterns
    const timing = analyzeTimingPattern(decision)
    if (timing) {
      patterns.push({
        category: PREFERENCE_CATEGORIES.TIMING,
        pattern: timing,
        confidence: 0.5,
        examples: [decision.decision.substring(0, 200)]
      })
    }

    const urgency = analyzeUrgencyPattern(decision)
    if (urgency) {
      patterns.push({
        category: PREFERENCE_CATEGORIES.URGENCY_THRESHOLD,
        pattern: urgency,
        confidence: 0.5,
        examples: [decision.decision.substring(0, 200)]
      })
    }
  }

  // Extract formality level
  const formality = analyzeFormality(decision.decision)
  if (formality) {
    patterns.push({
      category: PREFERENCE_CATEGORIES.FORMALITY,
      pattern: formality,
      confidence: 0.4,
      examples: [decision.decision.substring(0, 200)]
    })
  }

  return patterns
}

// ============================================================================
// Pattern Analysis Functions
// ============================================================================

function analyzeMessageStyle(message: string): string | null {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('let me') || lowerMessage.includes("i'll") || lowerMessage.includes('we can')) {
    return 'collaborative'
  }
  if (lowerMessage.includes('you should') || lowerMessage.includes('i recommend')) {
    return 'directive'
  }
  if (lowerMessage.includes('what if') || lowerMessage.includes('have you considered')) {
    return 'consultative'
  }
  if (lowerMessage.includes('great question') || lowerMessage.includes('absolutely')) {
    return 'supportive'
  }

  return null
}

function analyzeTone(message: string): string | null {
  const lowerMessage = message.toLowerCase()

  // Check for emoji usage - use simple emoji detection to avoid regex flag issues
  const hasEmojis = /[\uD83C-\uDBFF\uDC00-\uDFFF]/.test(message)

  // Check for exclamation marks
  const exclamationCount = (message.match(/!/g) || []).length
  const isEnthusiastic = exclamationCount > 2 || hasEmojis

  // Check for formal markers
  const formalMarkers = ['regarding', 'pursuant', 'accordingly', 'therefore', 'hereby']
  const hasFormalMarkers = formalMarkers.some(marker => lowerMessage.includes(marker))

  // Check for casual markers
  const casualMarkers = ['hey', 'gonna', 'wanna', 'kinda', 'btw', 'fyi']
  const hasCasualMarkers = casualMarkers.some(marker => lowerMessage.includes(marker))

  if (hasFormalMarkers) return 'formal'
  if (hasCasualMarkers) return 'casual'
  if (isEnthusiastic) return 'enthusiastic'
  return 'professional'
}

function analyzeLength(message: string): string {
  const length = message.length

  if (length < 100) return 'concise'
  if (length < 300) return 'moderate'
  if (length < 600) return 'detailed'
  return 'comprehensive'
}

function analyzeFormality(message: string): string | null {
  const lowerMessage = message.toLowerCase()

  // Count formal indicators
  let formalScore = 0
  const formalPatterns = [
    /\bplease\b/gi,
    /\bthank you\b/gi,
    /\bkindly\b/gi,
    /\bwould you\b/gi,
    /\bcould you\b/gi,
    /\bi appreciate\b/gi
  ]
  formalPatterns.forEach(pattern => {
    if (pattern.test(message)) formalScore++
  })

  // Count informal indicators
  let informalScore = 0
  const informalPatterns = [
    /\bhey\b/gi,
    /\bhi\b/gi,
    /\byeah\b/gi,
    /\bnope\b/gi,
    /\bcool\b/gi,
    /\bawesome\b/gi
  ]
  informalPatterns.forEach(pattern => {
    if (pattern.test(message)) informalScore++
  })

  if (formalScore > informalScore + 1) return 'high_formality'
  if (informalScore > formalScore + 1) return 'low_formality'
  return 'balanced_formality'
}

function analyzePricingPattern(decision: Decision): string | null {
  const context = decision.context as Record<string, unknown>
  const decisionText = decision.decision.toLowerCase()

  // Look for pricing strategies
  if (decisionText.includes('discount') || decisionText.includes('% off')) {
    return 'discount_friendly'
  }
  if (decisionText.includes('premium') || decisionText.includes('value-based')) {
    return 'premium_positioning'
  }
  if (decisionText.includes('competitive') || decisionText.includes('market rate')) {
    return 'competitive_pricing'
  }
  if (decisionText.includes('bundle') || decisionText.includes('package')) {
    return 'bundling_strategy'
  }

  return null
}

function analyzeTimingPattern(decision: Decision): string | null {
  const decisionText = decision.decision.toLowerCase()

  if (decisionText.includes('immediately') || decisionText.includes('right away') || decisionText.includes('asap')) {
    return 'immediate_response'
  }
  if (decisionText.includes('within 24') || decisionText.includes('next day')) {
    return 'same_day_response'
  }
  if (decisionText.includes('follow up') || decisionText.includes('check in')) {
    return 'scheduled_followup'
  }

  return null
}

function analyzeUrgencyPattern(decision: Decision): string | null {
  const context = decision.context as Record<string, unknown>
  const decisionText = decision.decision.toLowerCase()

  if (decisionText.includes('urgent') || decisionText.includes('priority') || decisionText.includes('immediately')) {
    return 'high_urgency'
  }
  if (decisionText.includes('when convenient') || decisionText.includes('no rush')) {
    return 'low_urgency'
  }

  return 'normal_urgency'
}

// ============================================================================
// Learning Insights
// ============================================================================

/**
 * Generate insights from learned preferences and decision history
 */
export async function generateLearningInsights(
  businessId: string
): Promise<LearningInsight[]> {
  const preferences = await getLearnedPreferences(businessId)
  const recentDecisions = await getDecisionHistory(businessId, { limit: 100 })

  const insights: LearningInsight[] = []

  // Group preferences by category
  const preferencesByCategory = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) acc[pref.category] = []
    acc[pref.category].push(pref)
    return acc
  }, {} as Record<string, LearnedPreference[]>)

  // Generate insights for each category
  for (const [category, prefs] of Object.entries(preferencesByCategory)) {
    // Find the highest confidence preference in this category
    const topPref = prefs.sort((a, b) => b.confidence - a.confidence)[0]

    if (topPref && topPref.confidence >= 0.5) {
      const categoryLabel = category.replace(/_/g, ' ')
      const isAvoidance = topPref.preference.startsWith('avoid:')

      let insight: string
      if (isAvoidance) {
        const avoided = topPref.preference.replace('avoid:', '')
        insight = `Avoids ${avoided} in ${categoryLabel}`
      } else {
        insight = `Prefers ${topPref.preference} ${categoryLabel}`
      }

      insights.push({
        category,
        insight,
        confidence: topPref.confidence,
        basedOn: topPref.examples.length
      })
    }
  }

  // Analyze decision feedback patterns
  const feedbackStats = recentDecisions.reduce((acc, d) => {
    if (d.ownerFeedback) {
      acc[d.ownerFeedback] = (acc[d.ownerFeedback] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const totalFeedback = Object.values(feedbackStats).reduce((a, b) => a + b, 0)
  if (totalFeedback >= 10) {
    const approvalRate = ((feedbackStats.approved || 0) / totalFeedback) * 100

    if (approvalRate >= 80) {
      insights.push({
        category: 'overall_alignment',
        insight: `Strong alignment with owner preferences (${approvalRate.toFixed(0)}% approval rate)`,
        confidence: 0.9,
        basedOn: totalFeedback
      })
    } else if (approvalRate >= 60) {
      insights.push({
        category: 'overall_alignment',
        insight: `Moderate alignment with owner preferences (${approvalRate.toFixed(0)}% approval rate)`,
        confidence: 0.6,
        basedOn: totalFeedback
      })
    } else {
      insights.push({
        category: 'overall_alignment',
        insight: `Learning in progress - continue providing feedback for better alignment`,
        confidence: 0.3,
        basedOn: totalFeedback
      })
    }
  }

  return insights.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get preference summary for AI context injection
 * Returns a string that can be added to AI prompts for better personalization
 */
export async function getPreferenceSummaryForAI(
  businessId: string
): Promise<string> {
  const preferences = await getLearnedPreferences(businessId)

  if (preferences.length === 0) {
    return ''
  }

  // Only include high-confidence preferences
  const highConfidencePrefs = preferences.filter(p => p.confidence >= 0.5)

  if (highConfidencePrefs.length === 0) {
    return ''
  }

  const lines = ['OWNER PREFERENCES (learned from feedback):']

  // Group by category
  const byCategory = highConfidencePrefs.reduce((acc, pref) => {
    if (!acc[pref.category]) acc[pref.category] = []
    acc[pref.category].push(pref)
    return acc
  }, {} as Record<string, LearnedPreference[]>)

  for (const [category, prefs] of Object.entries(byCategory)) {
    const categoryLabel = category.replace(/_/g, ' ')
    const topPrefs = prefs
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2)

    for (const pref of topPrefs) {
      const isAvoidance = pref.preference.startsWith('avoid:')
      if (isAvoidance) {
        const avoided = pref.preference.replace('avoid:', '')
        lines.push(`- AVOID: ${avoided} (${categoryLabel})`)
      } else {
        lines.push(`- PREFER: ${pref.preference} (${categoryLabel}, ${(pref.confidence * 100).toFixed(0)}% confident)`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Check if a proposed decision aligns with learned preferences
 */
export async function checkDecisionAlignment(
  businessId: string,
  proposedDecision: string,
  decisionType: string
): Promise<{
  alignmentScore: number
  conflicts: string[]
  suggestions: string[]
}> {
  const preferences = await getLearnedPreferences(businessId)

  let alignmentScore = 0.5 // Neutral starting point
  const conflicts: string[] = []
  const suggestions: string[] = []

  // Check against relevant preferences
  for (const pref of preferences) {
    const isAvoidance = pref.preference.startsWith('avoid:')
    const prefValue = isAvoidance ? pref.preference.replace('avoid:', '') : pref.preference

    // Simple keyword matching (can be enhanced with more sophisticated NLP)
    const decisionLower = proposedDecision.toLowerCase()
    const prefLower = prefValue.toLowerCase()

    if (decisionLower.includes(prefLower)) {
      if (isAvoidance) {
        // Decision includes something to avoid
        alignmentScore -= 0.2 * pref.confidence
        conflicts.push(`Contains "${prefValue}" which has been rejected previously`)
      } else {
        // Decision aligns with preference
        alignmentScore += 0.1 * pref.confidence
      }
    }
  }

  // Clamp alignment score
  alignmentScore = Math.max(0, Math.min(1, alignmentScore))

  // Generate suggestions if alignment is low
  if (alignmentScore < 0.4) {
    const highConfidencePrefs = preferences
      .filter(p => p.confidence >= 0.6 && !p.preference.startsWith('avoid:'))
      .slice(0, 3)

    for (const pref of highConfidencePrefs) {
      suggestions.push(`Consider incorporating "${pref.preference}" (${pref.category})`)
    }
  }

  return { alignmentScore, conflicts, suggestions }
}
