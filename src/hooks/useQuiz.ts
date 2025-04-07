
import { useContext } from 'react';
import QuizContext from '@/context/QuizContext';
import { toast } from 'sonner';
import { getFirebaseBackupQuestions } from '@/services/aiService';
import { Question } from '@/types/quiz';

export const useQuiz = () => {
  const context = useContext(QuizContext);
  
  if (context === undefined) {
    console.error('useQuiz must be used within a QuizProvider');
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  
  // Proxy les fonctions pour ajouter une gestion d'erreur supplémentaire
  const enhancedContext = {
    ...context,
    getQuiz: async (id: string) => {
      try {
        console.log(`useQuiz: Récupération du quiz ${id}`);
        
        // Ajouter un timeout pour éviter les attentes infinies
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Timeout lors de la récupération du quiz'));
          }, 5000); // 5 secondes de timeout
        });
        
        // Race entre la récupération normale et le timeout
        const result = await Promise.race([
          context.getQuiz(id),
          timeoutPromise
        ]) as any;
        
        if (result) {
          console.log(`useQuiz: Quiz ${id} récupéré avec succès:`, {
            title: result.title,
            questionsCount: result.questions?.length || 0
          });
          
          // Vérifier si le quiz a des questions
          if (!result.questions || result.questions.length === 0) {
            console.warn(`useQuiz: Quiz ${id} ne contient pas de questions, utilisation des questions de secours`);
            
            // Récupérer les questions de secours depuis Firebase
            const backupQuestions = await getFirebaseBackupQuestions();
            result.questions = backupQuestions;
            result.title = result.title || "Quiz de secours";
            result.description = result.description || "Quiz généré automatiquement";
          }
          
          return result;
        } else {
          console.error(`useQuiz: Quiz ${id} non trouvé, génération d'un quiz de secours`);
          
          // Créer un quiz de secours avec des questions de Firebase
          const backupQuestions = await getFirebaseBackupQuestions();
          
          // Construire un quiz de secours
          const backupQuiz = {
            id,
            title: "Quiz de secours",
            description: "Quiz généré automatiquement suite à une erreur",
            questions: backupQuestions,
            createdAt: new Date().toISOString().split('T')[0],
            completionRate: 0,
            duration: "30 min",
            participants: 0,
            difficulty: "medium",
            timeLimit: 30
          };
          
          console.log("useQuiz: Quiz de secours créé:", backupQuiz);
          return backupQuiz;
        }
      } catch (error) {
        console.error(`useQuiz: Erreur lors de la récupération du quiz ${id}:`, error);
        
        // Créer un quiz de secours avec des questions de Firebase
        try {
          console.log("useQuiz: Création d'un quiz de secours suite à une erreur");
          const backupQuestions = await getFirebaseBackupQuestions();
          
          // Construire un quiz de secours
          const backupQuiz = {
            id,
            title: "Quiz de secours",
            description: "Quiz généré automatiquement suite à une erreur",
            questions: backupQuestions,
            createdAt: new Date().toISOString().split('T')[0],
            completionRate: 0,
            duration: "30 min",
            participants: 0,
            difficulty: "medium",
            timeLimit: 30
          };
          
          console.log("useQuiz: Quiz de secours créé avec succès");
          return backupQuiz;
        } catch (fallbackError) {
          console.error("useQuiz: Erreur lors de la création du quiz de secours:", fallbackError);
          return null;
        }
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
        throw error; // Remonter l'erreur pour permettre au service AI de gérer la solution de secours
      }
    }
  };
  
  return enhancedContext;
};
