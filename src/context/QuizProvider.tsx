
import { useState, ReactNode } from 'react';
import QuizContext from './QuizContext';
import { Quiz } from '@/types/quiz';
import { mockQuizzes } from '@/data/mockQuizzes';

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>(mockQuizzes);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const createQuiz = async (file: File, numQuestions: number, additionalInfo?: string): Promise<string> => {
    setIsLoading(true);
    
    try {
      // Simulate quiz creation with AI
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newQuiz: Quiz = {
        id: String(quizzes.length + 1),
        title: file.name.split('.')[0],
        description: additionalInfo || 'AI-generated quiz based on your materials.',
        questions: Array.from({ length: numQuestions }).map((_, i) => ({
          id: `q${i + 1}`,
          text: `Sample question ${i + 1}`,
          options: [
            { id: 'a', text: 'Option A', isCorrect: false },
            { id: 'b', text: 'Option B', isCorrect: true },
            { id: 'c', text: 'Option C', isCorrect: false },
            { id: 'd', text: 'Option D', isCorrect: false },
          ],
          explanation: 'This is a sample explanation for the correct answer.',
        })),
        createdAt: new Date().toISOString().split('T')[0],
        duration: `${Math.round(numQuestions * 1.5)} min`,
      };
      
      setQuizzes(prev => [newQuiz, ...prev]);
      setCurrentQuiz(newQuiz);
      
      return newQuiz.id;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getQuiz = (id: string): Quiz | null => {
    const quiz = quizzes.find(q => q.id === id) || null;
    setCurrentQuiz(quiz);
    return quiz;
  };
  
  const submitQuizAnswers = async (quizId: string, answers: Record<string, string>): Promise<number> => {
    setIsLoading(true);
    
    try {
      // Simulate submitting answers
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const quiz = quizzes.find(q => q.id === quizId);
      
      if (!quiz) {
        throw new Error('Quiz not found');
      }
      
      // Calculate score (randomly for demo)
      const score = Math.floor(Math.random() * 101);
      
      // Update completion rate
      const updatedQuizzes = quizzes.map(q => {
        if (q.id === quizId) {
          return { ...q, completionRate: 100 };
        }
        return q;
      });
      
      setQuizzes(updatedQuizzes);
      
      return score;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteQuiz = async (id: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Simulate deleting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setQuizzes(prev => prev.filter(quiz => quiz.id !== id));
      
      if (currentQuiz?.id === id) {
        setCurrentQuiz(null);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const shareQuiz = async (id: string): Promise<string> => {
    // Simulate sharing quiz and getting link
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const shareLink = `https://quizflick.app/shared-quiz/${id}`;
    return shareLink;
  };
  
  return (
    <QuizContext.Provider
      value={{
        quizzes,
        currentQuiz,
        isLoading,
        createQuiz,
        getQuiz,
        submitQuizAnswers,
        deleteQuiz,
        shareQuiz,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};
