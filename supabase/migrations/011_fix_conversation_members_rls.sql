-- Drop the old policy
DROP POLICY IF EXISTS "Members can view own memberships" ON conversation_members;

-- Allow users to see conversation members by checking if they are in the same conversation.
-- We use a SECURITY DEFINER function to bypass RLS and avoid infinite recursion.
CREATE OR REPLACE FUNCTION user_in_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT exists (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view conversation members if they are in the conversation"
ON conversation_members FOR SELECT USING (
  user_in_conversation(conversation_members.conversation_id)
);
