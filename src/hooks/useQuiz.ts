
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
  
  // Proxy the functions to add additional error handling
  const enhancedContext = {
    ...context,
    getQuiz: async (id: string) => {
      try {
        console.log(`useQuiz: Récupération du quiz ${id}`);
        const result = await context.getQuiz(id);
        console.log(`useQuiz: Résultat de la récupération:`, result ? 'Quiz trouvé' : 'Quiz non trouvé');
        return result;
      } catch (error) {
        console.error(`useQuiz: Erreur lors de la récupération du quiz ${id}:`, error);
        toast.error('Erreur lors de la récupération du quiz');
        return null;
      }
    }
  };
  
  return enhancedContext;
};
