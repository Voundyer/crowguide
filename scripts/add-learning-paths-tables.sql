-- Add tables for custom learning paths

-- Learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT,
    estimated_duration TEXT,
    is_custom BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add learning_path_id to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS learning_path_id TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS phase_order INTEGER DEFAULT 0;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS topic_order INTEGER DEFAULT 0;

-- Enable RLS for learning_paths
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

-- Create policies for learning_paths
DROP POLICY IF EXISTS "Users can view own learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Users can insert own learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Users can update own learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Users can delete own learning paths" ON learning_paths;

CREATE POLICY "Users can view own learning paths" ON learning_paths FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning paths" ON learning_paths FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learning paths" ON learning_paths FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own learning paths" ON learning_paths FOR DELETE USING (auth.uid() = user_id);

-- Update topics policy to allow custom topics
DROP POLICY IF EXISTS "Topics are viewable by everyone" ON topics;
CREATE POLICY "Topics are viewable by everyone" ON topics FOR SELECT USING (
    learning_path_id IS NULL OR 
    learning_path_id IN (
        SELECT id FROM learning_paths WHERE user_id = auth.uid()
    ) OR
    learning_path_id NOT LIKE 'custom-%'
);

-- Allow users to insert their own custom topics
CREATE POLICY "Users can insert custom topics" ON topics FOR INSERT WITH CHECK (
    learning_path_id IS NOT NULL AND 
    learning_path_id IN (
        SELECT id FROM learning_paths WHERE user_id = auth.uid()
    )
);
