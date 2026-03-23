-- Enforce a maximum message body length at the DB layer (defence-in-depth).
ALTER TABLE messages ADD CONSTRAINT messages_body_max_length CHECK (char_length(body) <= 2000);

-- Atomically creates a conversation and adds both members in one transaction.
-- Uses a transaction-scoped advisory lock keyed on the sorted member pair to
-- prevent duplicate conversations under concurrent requests (race condition fix).
-- If a conversation between the same two members already exists, returns the
-- existing conversation id instead of creating a duplicate.

CREATE OR REPLACE FUNCTION create_conversation_with_members(
  member_a uuid,
  member_b uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conv_id uuid;
  new_conv_id uuid;
  lock_key bigint;
BEGIN
  -- Derive a stable, order-independent lock key from the sorted pair.
  lock_key := hashtext(LEAST(member_a::text, member_b::text) || ':' || GREATEST(member_a::text, member_b::text));
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Return existing conversation if one already exists between these two members.
  SELECT cm1.conversation_id INTO existing_conv_id
  FROM conversation_members cm1
  JOIN conversation_members cm2
    ON cm2.conversation_id = cm1.conversation_id
   AND cm2.profile_id = member_b
  WHERE cm1.profile_id = member_a
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO new_conv_id;

  INSERT INTO conversation_members (conversation_id, profile_id)
  VALUES (new_conv_id, member_a), (new_conv_id, member_b);

  RETURN new_conv_id;
END;
$$;

-- Helper function: returns the last message per conversation (DISTINCT ON)
-- Replaces the unbounded "fetch all messages, deduplicate in JS" pattern.

CREATE OR REPLACE FUNCTION last_messages_for_conversations(conv_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  body           text,
  created_at     timestamptz,
  sender_id      uuid
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    body,
    created_at,
    sender_id
  FROM messages
  WHERE conversation_id = ANY(conv_ids)
  ORDER BY conversation_id, created_at DESC;
$$;

-- Helper function: returns unread message count per conversation for a given reader.
-- Replaces the "fetch all unread rows, count in JS" pattern.

CREATE OR REPLACE FUNCTION unread_counts_for_conversations(conv_ids uuid[], reader_profile_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  unread_count    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id, COUNT(*) AS unread_count
  FROM messages
  WHERE conversation_id = ANY(conv_ids)
    AND read_at IS NULL
    AND sender_id <> reader_profile_id
  GROUP BY conversation_id;
$$;

-- Atomically replaces all skills for a profile in a single transaction.
-- Matches the replace_education pattern: security invoker so the caller's
-- RLS policies apply, ownership check via auth.uid(), delete + insert in one txn.

CREATE OR REPLACE FUNCTION replace_skills(p_profile_id uuid, p_skills jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM profile_skills WHERE profile_id = p_profile_id;

  INSERT INTO profile_skills (profile_id, name, sort_order)
  SELECT
    p_profile_id,
    trim(e.value::text, '"'),
    (row_number() OVER ()) - 1
  FROM jsonb_array_elements(p_skills) AS e
  WHERE trim(e.value::text, '"') <> '';
END;
$$;
