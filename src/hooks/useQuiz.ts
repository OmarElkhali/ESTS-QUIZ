
import { useContext } from 'react';
import QuizContext from '@/context/QuizContext';
import { toast } from 'sonner';

export const useQuiz = () => {
  const context = useContext(QuizContext);
  
  if (context === undefined) {
    console.error('useQuiz must be used within a QuizProvider');
    toast.error('Erreur d\'initialisation du contexte Quiz');
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  
  return context;
};
