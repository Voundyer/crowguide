-- Create tables for the AI Learning Roadmap

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Topics table (public, no RLS needed)
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    phase TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    topic_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT DEFAULT '',
    study_time INTEGER DEFAULT 0, -- in minutes
    last_studied TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Checklist items table
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    topic_id TEXT NOT NULL,
    content TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    total_study_time INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    total_notes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;

DROP POLICY IF EXISTS "Users can view own checklist" ON checklist_items;
DROP POLICY IF EXISTS "Users can insert own checklist" ON checklist_items;
DROP POLICY IF EXISTS "Users can update own checklist" ON checklist_items;
DROP POLICY IF EXISTS "Users can delete own checklist" ON checklist_items;

DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

DROP POLICY IF EXISTS "Topics are viewable by everyone" ON topics;

-- Create policies for user_progress
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON user_progress FOR DELETE USING (auth.uid() = user_id);

-- Create policies for checklist_items
CREATE POLICY "Users can view own checklist" ON checklist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checklist" ON checklist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checklist" ON checklist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checklist" ON checklist_items FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_stats
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Topics are public
CREATE POLICY "Topics are viewable by everyone" ON topics FOR SELECT USING (true);

-- Clear existing topics and insert fresh data
DELETE FROM topics;

-- Insert default topics
INSERT INTO topics (id, title, phase, category, description) VALUES
-- Foundation Phase
('linear-algebra', 'Linear algebra (vectors, matrices, eigenvalues)', 'foundation', 'Mathematics & Statistics', 'Master the fundamentals of linear algebra essential for machine learning'),
('calculus', 'Calculus (derivatives, gradients, chain rule)', 'foundation', 'Mathematics & Statistics', 'Understand calculus concepts crucial for optimization in ML'),
('statistics', 'Statistics and probability theory', 'foundation', 'Mathematics & Statistics', 'Learn statistical foundations for data analysis and ML'),
('discrete-math', 'Discrete mathematics', 'foundation', 'Mathematics & Statistics', 'Study discrete math concepts for algorithms and data structures'),
('python-mastery', 'Python mastery (NumPy, Pandas, Matplotlib)', 'foundation', 'Programming Fundamentals', 'Become proficient in Python and essential data science libraries'),
('data-structures', 'Data structures and algorithms', 'foundation', 'Programming Fundamentals', 'Master fundamental programming concepts'),
('version-control', 'Version control with Git', 'foundation', 'Programming Fundamentals', 'Learn Git for code management and collaboration'),
('software-engineering', 'Basic software engineering practices', 'foundation', 'Programming Fundamentals', 'Understand software development best practices'),

-- Core Machine Learning
('supervised-learning', 'Supervised learning (regression, classification)', 'core', 'Traditional ML', 'Master supervised learning algorithms and techniques'),
('unsupervised-learning', 'Unsupervised learning (clustering, dimensionality reduction)', 'core', 'Traditional ML', 'Learn unsupervised learning methods'),
('model-evaluation', 'Model evaluation and validation', 'core', 'Traditional ML', 'Understand how to properly evaluate ML models'),
('feature-engineering', 'Feature engineering and selection', 'core', 'Traditional ML', 'Learn to create and select effective features'),
('scikit-learn', 'Scikit-learn proficiency', 'core', 'Traditional ML', 'Master the scikit-learn library'),
('neural-networks', 'Neural network fundamentals', 'core', 'Deep Learning Basics', 'Understand the basics of neural networks'),
('backpropagation', 'Backpropagation and gradient descent', 'core', 'Deep Learning Basics', 'Learn how neural networks are trained'),
('frameworks', 'TensorFlow or PyTorch', 'core', 'Deep Learning Basics', 'Master a deep learning framework'),
('architectures', 'Common architectures (MLPs, CNNs, RNNs)', 'core', 'Deep Learning Basics', 'Understand basic neural network architectures'),

-- Advanced Deep Learning
('cnns', 'Convolutional Neural Networks (computer vision)', 'advanced', 'Specialized Architectures', 'Master CNNs for computer vision tasks'),
('rnns', 'Recurrent Neural Networks (sequence modeling)', 'advanced', 'Specialized Architectures', 'Learn RNNs for sequential data'),
('transformers', 'Transformer architecture', 'advanced', 'Specialized Architectures', 'Understand the transformer architecture'),
('generative-models', 'Generative models (GANs, VAEs)', 'advanced', 'Specialized Architectures', 'Learn generative modeling techniques'),
('text-preprocessing', 'Text preprocessing and tokenization', 'advanced', 'Natural Language Processing', 'Master text preprocessing for NLP'),
('word-embeddings', 'Word embeddings (Word2Vec, GloVe)', 'advanced', 'Natural Language Processing', 'Understand word representation techniques'),
('language-models', 'Language models and transformers', 'advanced', 'Natural Language Processing', 'Learn about language modeling'),
('fine-tuning', 'Fine-tuning pre-trained models', 'advanced', 'Natural Language Processing', 'Master transfer learning techniques'),

-- Modern AI Systems
('transformer-deep', 'Understanding transformer architecture deeply', 'modern', 'Large Language Models', 'Deep dive into transformer mechanics'),
('pretraining', 'Pre-training and fine-tuning techniques', 'modern', 'Large Language Models', 'Learn modern training techniques'),
('prompt-engineering', 'Prompt engineering and in-context learning', 'modern', 'Large Language Models', 'Master prompt engineering'),
('rlhf', 'RLHF (Reinforcement Learning from Human Feedback)', 'modern', 'Large Language Models', 'Understand RLHF techniques'),
('model-deployment', 'Model deployment and serving', 'modern', 'MLOps & Production', 'Learn to deploy ML models'),
('containerization', 'Containerization (Docker, Kubernetes)', 'modern', 'MLOps & Production', 'Master containerization for ML'),
('ci-cd', 'CI/CD for ML pipelines', 'modern', 'MLOps & Production', 'Implement ML pipelines'),
('monitoring', 'Model monitoring and maintenance', 'modern', 'MLOps & Production', 'Learn ML model monitoring'),
('cloud-platforms', 'Cloud platforms (AWS, GCP, Azure)', 'modern', 'MLOps & Production', 'Master cloud platforms for ML'),

-- Specialized Domains
('image-classification', 'Image classification and object detection', 'specialized', 'Computer Vision', 'Master computer vision tasks'),
('semantic-segmentation', 'Semantic segmentation', 'specialized', 'Computer Vision', 'Learn advanced computer vision'),
('generative-images', 'Generative models for images', 'specialized', 'Computer Vision', 'Create generative image models'),
('opencv', 'OpenCV and image processing', 'specialized', 'Computer Vision', 'Master image processing'),
('rl-algorithms', 'RL algorithms (Q-learning, policy gradients)', 'specialized', 'Robotics & RL', 'Learn reinforcement learning'),
('simulation', 'Simulation environments', 'specialized', 'Robotics & RL', 'Master RL simulation'),
('robot-control', 'Robot control systems', 'specialized', 'Robotics & RL', 'Learn robotics control'),
('vision-language', 'Vision-language models', 'specialized', 'Multimodal AI', 'Master multimodal AI'),
('audio-processing', 'Audio processing', 'specialized', 'Multimodal AI', 'Learn audio AI techniques'),
('cross-modal', 'Cross-modal understanding', 'specialized', 'Multimodal AI', 'Understand cross-modal AI'),

-- Professional Development
('data-engineering', 'Data engineering basics', 'professional', 'Industry Skills', 'Learn data engineering fundamentals'),
('system-design', 'System design for ML systems', 'professional', 'Industry Skills', 'Master ML system design'),
('performance-optimization', 'Performance optimization', 'professional', 'Industry Skills', 'Optimize ML systems'),
('security-privacy', 'Security and privacy in AI', 'professional', 'Industry Skills', 'Understand AI security'),
('technical-communication', 'Technical communication', 'professional', 'Soft Skills', 'Improve technical communication'),
('project-management', 'Project management', 'professional', 'Soft Skills', 'Learn project management'),
('collaboration', 'Cross-functional collaboration', 'professional', 'Soft Skills', 'Master team collaboration'),
('ai-ethics', 'Ethics in AI development', 'professional', 'Soft Skills', 'Understand AI ethics');
