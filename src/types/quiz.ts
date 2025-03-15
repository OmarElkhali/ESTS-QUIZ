
export interface Question {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  completionRate?: number;
  duration: string;
  participants?: number;
}

export interface QuizContextType {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  isLoading: boolean;
  createQuiz: (file: File, numQuestions: number, additionalInfo?: string) => Promise<string>;
  getQuiz: (id: string) => Quiz | null;
  submitQuizAnswers: (quizId: string, answers: Record<string, string>) => Promise<number>;
  deleteQuiz: (id: string) => Promise<void>;
  shareQuiz: (id: string) => Promise<string>;
}
