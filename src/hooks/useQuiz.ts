
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
  
  // Proxy les fonctions pour ajouter une gestion d'erreur supplémentaire
  const enhancedContext = {
    ...context,
    getQuiz: async (id: string) => {
      try {
        console.log(`useQuiz: Récupération du quiz ${id}`);
        const result = await context.getQuiz(id);
        
        if (result) {
          console.log(`useQuiz: Quiz ${id} récupéré avec succès:`, {
            title: result.title,
            questionsCount: result.questions?.length || 0
          });
        } else {
          console.error(`useQuiz: Quiz ${id} non trouvé`);
        }
        
        return result;
      } catch (error) {
        console.error(`useQuiz: Erreur lors de la récupération du quiz ${id}:`, error);
        toast.error('Erreur lors de la récupération du quiz');
        return null;
      }
    },
    createQuiz: async (
      file, 
      numQuestions, 
      difficulty, 
      timeLimit, 
      additionalInfo, 
      apiKey, 
      modelType, 
      progressCallback
    ) => {
      try {
        console.log(`useQuiz: Création d'un quiz avec ${numQuestions} questions (${modelType || 'qwen'})`);
        const quizId = await context.createQuiz(
          file, 
          numQuestions, 
          difficulty, 
          timeLimit, 
          additionalInfo, 
          apiKey, 
          modelType, 
          progressCallback
        );
        console.log(`useQuiz: Quiz créé avec succès, ID: ${quizId}`);
        return quizId;
      } catch (error) {
        console.error('useQuiz: Erreur lors de la création du quiz:', error);
        // Aucune notification à l'utilisateur en cas d'échec, nous utilisons la solution de secours
        throw error; // Remonter l'erreur pour permettre au service AI de gérer la solution de secours
      }
    }
  };
  
  return enhancedContext;
};
