import * as admin from 'firebase-admin'

const db = admin.firestore()

interface OnboardingResult {
  reply: string
  intent: string
}

type OnboardingStep =
  | 'welcome'
  | 'business_name'
  | 'email'
  | 'industry'
  | 'google_connect'
  | 'missed_calls'
  | 'complete'

export async function handleOnboarding(
  businessId: string,
  business: any,
  message: string,
  phone: string
): Promise<OnboardingResult> {
  const step = (business.onboarding_step as OnboardingStep) || 'welcome'

  switch (step) {
    case 'welcome':
      return handleWelcome(businessId)

    case 'business_name':
      return handleBusinessName(businessId, message)

    case 'email':
      return handleEmail(businessId, message)

    case 'industry':
      return handleIndustry(businessId, message)

    case 'google_connect':
      return handleGoogleConnect(businessId, message)

    case 'missed_calls':
      return handleMissedCalls(businessId, message)

    default:
      return {
        reply: "Something went wrong with setup. Text 'restart' to begin again.",
        intent: 'onboarding',
      }
  }
}

async function handleWelcome(businessId: string): Promise<OnboardingResult> {
  await db.collection('businesses').doc(businessId).update({
    onboarding_step: 'business_name',
  })

  return {
    reply:
      "Hey! I'm your GhostOps AI assistant. 👻\n\n" +
      "Let's get you set up in 2 minutes.\n\n" +
      "What's your business name?",
    intent: 'onboarding',
  }
}

async function handleBusinessName(businessId: string, name: string): Promise<OnboardingResult> {
  await db.collection('businesses').doc(businessId).update({
    name: name.trim(),
    onboarding_step: 'email',
  })

  return {
    reply: `Got it - "${name.trim()}"! ✅\n\nWhat's your business email?`,
    intent: 'onboarding',
  }
}

async function handleEmail(businessId: string, email: string): Promise<OnboardingResult> {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return {
      reply: "That doesn't look like a valid email. Try again?",
      intent: 'onboarding',
    }
  }

  await db.collection('businesses').doc(businessId).update({
    email: email.trim().toLowerCase(),
    onboarding_step: 'industry',
  })

  return {
    reply:
      'Perfect! ✅\n\n' +
      'What type of business are you?\n\n' +
      '1. Home Services (plumber, HVAC, etc)\n' +
      '2. Construction/Remodeling\n' +
      '3. Auto Services\n' +
      '4. Professional Services\n' +
      '5. Other\n\n' +
      'Just reply with the number or describe it.',
    intent: 'onboarding',
  }
}

async function handleIndustry(businessId: string, response: string): Promise<OnboardingResult> {
  const industries: Record<string, string> = {
    '1': 'home_services',
    '2': 'construction',
    '3': 'auto_services',
    '4': 'professional_services',
    '5': 'other',
  }

  const industry = industries[response.trim()] || response.trim().toLowerCase()

  await db.collection('businesses').doc(businessId).update({
    industry,
    onboarding_step: 'google_connect',
  })

  // Generate OAuth URL
  const oauthUrl = `https://api.ghostops.ai/auth/google/start?business=${businessId}`

  return {
    reply:
      'Great! ✅\n\n' +
      "Now let's connect your Google account so I can manage your calendar and reviews.\n\n" +
      `Tap here to connect: ${oauthUrl}\n\n` +
      "Once you've connected, just text me 'done'.",
    intent: 'onboarding',
  }
}

async function handleGoogleConnect(businessId: string, message: string): Promise<OnboardingResult> {
  const lower = message.toLowerCase().trim()

  if (lower === 'skip') {
    await db.collection('businesses').doc(businessId).update({
      onboarding_step: 'missed_calls',
    })

    return {
      reply:
        "No problem - you can connect Google later.\n\n" +
        "Last question: Want me to handle your missed calls? " +
        "When someone calls and you can't answer, I'll text them back instantly.\n\n" +
        "Reply 'yes' or 'no'",
      intent: 'onboarding',
    }
  }

  // Check if Google was actually connected
  const businessDoc = await db.collection('businesses').doc(businessId).get()
  const business = businessDoc.data()

  if (business?.google_connected) {
    await db.collection('businesses').doc(businessId).update({
      onboarding_step: 'missed_calls',
    })

    return {
      reply:
        'Google connected! ✅\n\n' +
        "Last question: Want me to handle your missed calls? " +
        "When someone calls and you can't answer, I'll text them back instantly.\n\n" +
        "Reply 'yes' or 'no'",
      intent: 'onboarding',
    }
  }

  return {
    reply:
      "I don't see the connection yet. " +
      "Make sure you completed the Google sign-in, then text me 'done'.\n\n" +
      "Or text 'skip' to set this up later.",
    intent: 'onboarding',
  }
}

async function handleMissedCalls(businessId: string, response: string): Promise<OnboardingResult> {
  const lower = response.toLowerCase().trim()
  const enabled = lower === 'yes' || lower === 'y' || lower === 'yeah' || lower === 'yep'

  await db.collection('businesses').doc(businessId).update({
    missed_call_enabled: enabled,
    onboarding_step: 'complete',
    onboarding_complete: true,
    onboarded_at: admin.firestore.FieldValue.serverTimestamp(),
  })

  const missedCallNote = enabled
    ? "✅ Missed call text-back is ON\n"
    : "Missed call text-back is off (you can enable it later)\n"

  return {
    reply:
      "You're all set! 🎉\n\n" +
      missedCallNote +
      "\nI'm working for you 24/7 now. Here's what I can do:\n\n" +
      "📅 'what's my day' - see your schedule\n" +
      "💰 'invoice [name] $[amount]' - send invoices\n" +
      "📧 'email [name]...' - draft and send emails\n" +
      "📱 Send a photo - I'll create social posts\n" +
      "📊 'how much did I make' - see your stats\n" +
      "⭐ 'ask [name] for review' - request reviews\n\n" +
      "Just text me like you'd text an employee. 👻",
    intent: 'onboarding',
  }
}

/**
 * Reset onboarding for a business (for testing or user request)
 */
export async function resetOnboarding(businessId: string) {
  await db.collection('businesses').doc(businessId).update({
    onboarding_step: 'welcome',
    onboarding_complete: false,
  })
}
