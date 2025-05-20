
-- ======================
-- POLICIES: profiles
-- ======================
CREATE OR REPLACE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE OR REPLACE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE OR REPLACE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- ======================
-- POLICIES: exam_attempts
-- ======================
CREATE POLICY "Users can view their own exam attempts" 
  ON exam_attempts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam attempts" 
  ON exam_attempts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam attempts" 
  ON exam_attempts FOR UPDATE 
  USING (auth.uid() = user_id);

-- ======================
-- POLICIES: question_responses
-- ======================
CREATE POLICY "Users can view their own question responses" 
  ON question_responses FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts 
      WHERE exam_attempts.id = question_responses.attempt_id 
        AND exam_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own question responses" 
  ON question_responses FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_attempts 
      WHERE exam_attempts.id = question_responses.attempt_id 
        AND exam_attempts.user_id = auth.uid()
    )
  );
