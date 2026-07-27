-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260327015818, on 2026-07-27.
-- This is what actually ran in production. Do not edit.

-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- ── conversations ──────────────────────────────────────
-- Users can read conversations they're a member of
CREATE POLICY "Users can read own conversations" ON public.conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
  );

-- Authenticated users can create conversations
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── conversation_members ──────────────────────────────
-- Users can read membership for conversations they belong to
CREATE POLICY "Users can read own conversation memberships" ON public.conversation_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM public.conversation_members cm WHERE cm.user_id = auth.uid())
  );

-- Authenticated users can insert conversation members
CREATE POLICY "Authenticated users can add conversation members" ON public.conversation_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own membership (e.g., unread_count)
CREATE POLICY "Users can update own conversation membership" ON public.conversation_members
  FOR UPDATE USING (user_id = auth.uid());

-- ── messages ──────────────────────────────────────────
-- Users can read messages in conversations they belong to
CREATE POLICY "Users can read messages in own conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
  );

-- Users can insert messages in conversations they belong to
CREATE POLICY "Users can send messages in own conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
  );

-- ── groups ────────────────────────────────────────────
-- Anyone can read groups
CREATE POLICY "Anyone can read groups" ON public.groups
  FOR SELECT USING (true);

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group admins can update their groups
CREATE POLICY "Group admins can update groups" ON public.groups
  FOR UPDATE USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── group_members ──────────────────────────────────────
-- Anyone can read group members
CREATE POLICY "Anyone can read group members" ON public.group_members
  FOR SELECT USING (true);

-- Authenticated users can join groups
CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can leave groups (delete own membership)
CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (user_id = auth.uid());

-- ── game_options ──────────────────────────────────────
-- Anyone can read game options
CREATE POLICY "Anyone can read game options" ON public.game_options
  FOR SELECT USING (true);

-- Game creator can manage options
CREATE POLICY "Game creator can insert options" ON public.game_options
  FOR INSERT WITH CHECK (
    game_id IN (SELECT id FROM public.games WHERE created_by = auth.uid())
  );

CREATE POLICY "Game creator can update options" ON public.game_options
  FOR UPDATE USING (
    game_id IN (SELECT id FROM public.games WHERE created_by = auth.uid())
  );

CREATE POLICY "Game creator can delete options" ON public.game_options
  FOR DELETE USING (
    game_id IN (SELECT id FROM public.games WHERE created_by = auth.uid())
  );

-- ── game_players ──────────────────────────────────────
-- Anyone can read game players
CREATE POLICY "Anyone can read game players" ON public.game_players
  FOR SELECT USING (true);

-- Users can join/be invited to games
CREATE POLICY "Users can join games" ON public.game_players
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own player status
CREATE POLICY "Users can update own game player status" ON public.game_players
  FOR UPDATE USING (user_id = auth.uid());

-- ── votes ──────────────────────────────────────────────
-- Anyone can read votes
CREATE POLICY "Anyone can read votes" ON public.votes
  FOR SELECT USING (true);

-- Users can insert/update their own votes
CREATE POLICY "Users can cast votes" ON public.votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own votes" ON public.votes
  FOR UPDATE USING (user_id = auth.uid());

-- ── games (additional policies) ────────────────────────
-- Game creator can update their games
CREATE POLICY "Game creator can update games" ON public.games
  FOR UPDATE USING (created_by = auth.uid());
