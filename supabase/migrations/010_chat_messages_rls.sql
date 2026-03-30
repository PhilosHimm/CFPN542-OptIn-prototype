-- Migration 010: Add insert policies for conversations and conversation_members

-- Allow authenticated users to create conversations
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to add members to a conversation (needed when creating a new chat)
CREATE POLICY "Authenticated users can add conversation members"
  ON conversation_members FOR INSERT TO authenticated WITH CHECK (true);


-- Allow authenticated users to update conversations (for updated_at when sending messages)
CREATE POLICY "Conversation members can update conversations"
  ON conversations FOR UPDATE USING (
    exists (
      select 1 from conversation_members
      where conversation_id = conversations.id
      and user_id = auth.uid()
    )
  );

