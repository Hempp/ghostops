import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'

const db = admin.firestore()

const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.api_key,
})

interface CalendarResult {
  reply: string
  intent: string
  actions?: any[]
}

export async function handleCalendar(
  businessId: string,
  message: string,
  intent: 'calendar_query' | 'calendar_add'
): Promise<CalendarResult> {
  // Get Google tokens
  const businessDoc = await db.collection('businesses').doc(businessId).get()
  const business = businessDoc.data()

  if (!business?.google_tokens) {
    return {
      reply: "I don't have access to your calendar yet. Tap this link to connect Google: [OAuth link]",
      intent,
    }
  }

  const auth = new google.auth.OAuth2(
    functions.config().google?.client_id,
    functions.config().google?.client_secret
  )
  auth.setCredentials(business.google_tokens)

  const calendar = google.calendar({ version: 'v3', auth })

  if (intent === 'calendar_query') {
    return queryCalendar(calendar, message)
  } else {
    return addCalendarEvent(calendar, businessId, message)
  }
}

async function queryCalendar(calendar: any, message: string): Promise<CalendarResult> {
  // Determine date range from message
  const now = new Date()
  let timeMin = new Date(now)
  let timeMax = new Date(now)

  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('today') || lowerMessage.includes('my day')) {
    timeMin.setHours(0, 0, 0, 0)
    timeMax.setHours(23, 59, 59, 999)
  } else if (lowerMessage.includes('tomorrow')) {
    timeMin.setDate(timeMin.getDate() + 1)
    timeMin.setHours(0, 0, 0, 0)
    timeMax.setDate(timeMax.getDate() + 1)
    timeMax.setHours(23, 59, 59, 999)
  } else if (lowerMessage.includes('week')) {
    timeMin.setHours(0, 0, 0, 0)
    timeMax.setDate(timeMax.getDate() + 7)
  } else {
    // Default to today
    timeMin.setHours(0, 0, 0, 0)
    timeMax.setHours(23, 59, 59, 999)
  }

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []

    if (events.length === 0) {
      return {
        reply: "Your calendar is clear! No appointments scheduled.",
        intent: 'calendar_query',
      }
    }

    const eventList = events
      .map((event: any) => {
        const start = event.start.dateTime || event.start.date
        const time = new Date(start).toLocaleTimeString('en', {
          hour: 'numeric',
          minute: '2-digit',
        })
        return `${time} - ${event.summary}`
      })
      .join('\n')

    return {
      reply: `You have ${events.length} appointment${events.length > 1 ? 's' : ''}:\n${eventList}`,
      intent: 'calendar_query',
    }
  } catch (error) {
    console.error('Calendar query error:', error)
    return {
      reply: "Couldn't access your calendar. Try reconnecting Google.",
      intent: 'calendar_query',
    }
  }
}

async function addCalendarEvent(
  calendar: any,
  businessId: string,
  message: string
): Promise<CalendarResult> {
  // Use Claude to extract event details
  const extraction = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: `Extract calendar event details from the message.
Today is ${new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
Respond as JSON: {"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "duration_minutes": 60}
If any field is unclear, make reasonable assumptions. Default duration is 60 minutes.`,
    messages: [{ role: 'user', content: message }],
  })

  try {
    const details = JSON.parse((extraction.content[0] as any).text)

    const startDateTime = new Date(`${details.date}T${details.time}:00`)
    const endDateTime = new Date(startDateTime.getTime() + details.duration_minutes * 60000)

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: details.title,
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      },
    })

    const formattedDate = startDateTime.toLocaleDateString('en', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    const formattedTime = startDateTime.toLocaleTimeString('en', {
      hour: 'numeric',
      minute: '2-digit',
    })

    return {
      reply: `Added to calendar: "${details.title}" on ${formattedDate} at ${formattedTime} ✅`,
      intent: 'calendar_add',
      actions: [{ type: 'calendar_event_created', event_id: event.data.id }],
    }
  } catch (error) {
    console.error('Calendar add error:', error)
    return {
      reply: "Couldn't add that to your calendar. Try being more specific with the date and time.",
      intent: 'calendar_add',
    }
  }
}
