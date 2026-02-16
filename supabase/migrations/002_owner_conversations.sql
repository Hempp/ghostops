-- Owner Conversations and Messages for Co-Founder AI
-- Migration: 002_owner_conversations.sql

-- Owner conversations table (one per business)
CREATE TABLE IF NOT EXISTS owner_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_phone TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Owner messages table
CREATE TABLE IF NOT EXISTS owner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_owner_messages_business_id ON owner_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_owner_messages_created_at ON owner_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_conversations_business_id ON owner_conversations(business_id);

-- RLS Policies
ALTER TABLE owner_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (our backend uses service role key)
CREATE POLICY "Service role full access to owner_conversations" ON owner_conversations
  FOR ALL USING (true);

CREATE POLICY "Service role full access to owner_messages" ON owner_messages
  FOR ALL USING (true);

-- Updated_at trigger for owner_conversations
CREATE OR REPLACE FUNCTION update_owner_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_owner_conversation_updated_at
  BEFORE UPDATE ON owner_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_owner_conversation_updated_at();
