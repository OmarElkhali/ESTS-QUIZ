
import { createContext } from 'react';
import { Quiz } from '@/types/quiz';

interface QuizContextType {
  quizzes: Quiz[];
  sharedQuizzes: Quiz[];
  currentQuiz: Quiz | null;
  isLoading: boolean;
  createQuiz: (
    file: File, 
    numQuestions: number, 
    difficulty: 'easy' | 'medium' | 'hard',
    timeLimit?: number,
    additionalInfo?: string, 
    apiKey?: string,
    modelType?: 'openai' | 'qwen' | 'gemini' | 'local'
  ) => Promise<string>;
  getQuiz: (id: string) => Promise<Quiz | null>;
  submitQuizAnswers: (quizId: string, answers: Record<string, string>) => Promise<number>;
  deleteQuiz: (id: string) => Promise<void>;
  shareQuiz: (id: string, email: string) => Promise<void>;
  removeCollaborator: (quizId: string, collaboratorId: string) => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export default QuizContext;
