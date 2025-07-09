-- Update topics policies for better user isolation

-- Drop existing policies
DROP POLICY IF EXISTS "Topics are viewable by everyone" ON topics;
DROP POLICY IF EXISTS "Users can insert custom topics" ON topics;

-- Create new policies with better isolation
CREATE POLICY "Default topics are viewable by everyone" ON topics FOR SELECT USING (
    learning_path_id IS NULL
);

CREATE POLICY "Users can view their own custom topics" ON topics FOR SELECT USING (
    learning_path_id IS NOT NULL AND 
    learning_path_id IN (
        SELECT id FROM learning_paths WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own custom topics" ON topics FOR INSERT WITH CHECK (
    learning_path_id IS NOT NULL AND 
    learning_path_id IN (
        SELECT id FROM learning_paths WHERE user_id = auth.uid()
    )
);

-- Ensure learning paths are properly isolated
DROP POLICY IF EXISTS "Users can view own learning paths" ON learning_paths;
CREATE POLICY "Users can view own learning paths" ON learning_paths FOR SELECT USING (auth.uid() = user_id);
