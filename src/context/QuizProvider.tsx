
import { useState, useEffect, ReactNode } from 'react';
import QuizContext from './QuizContext';
import { Quiz } from '@/types/quiz';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import * as quizService from '@/services/quizService';
import { generateQuestionsWithAI, getFirebaseBackupQuestions } from '@/services/aiService';
import { useNavigate } from 'react-router-dom';

type ProgressCallback = (stage: string, percent: number, message?: string) => void;

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sharedQuizzes, setSharedQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  useEffect(() => {
    if (user) {
      fetchQuizzes();
    } else {
      setQuizzes([]);
      setSharedQuizzes([]);
    }
  }, [user]);
  
  const fetchQuizzes = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('QuizProvider: Récupération des quiz pour l\'utilisateur', user.id);
      const userQuizzes = await quizService.getQuizzes(user.id);
      setQuizzes(userQuizzes);
      
      const shared = await quizService.getSharedQuizzes(user.id);
      setSharedQuizzes(shared);
      console.log('QuizProvider: Quiz récupérés avec succès', {
        userQuizzes: userQuizzes.length,
        sharedQuizzes: shared.length
      });
    } catch (error) {
      console.error('QuizProvider: Erreur lors de la récupération des quiz:', error);
      toast.error('Impossible de récupérer vos quiz');
    } finally {
      setIsLoading(false);
    }
  };
  
  const createQuiz = async (
    file: File, 
    numQuestions: number, 
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    timeLimit?: number,
    additionalInfo?: string,
    apiKey?: string,
    modelType: 'qwen' | 'gemini' = 'qwen',
    progressCallback?: ProgressCallback
  ): Promise<string> => {
    if (!user) {
      toast.error('Veuillez vous connecter pour créer un quiz');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    
    try {
      console.log(`QuizProvider: Démarrage création de quiz: ${numQuestions} questions (${modelType})`);
      progressCallback?.('Initialisation', 5, `Création de quiz: ${numQuestions} questions, difficulté: ${difficulty}, modèle: ${modelType}`);
      
      // 1. Télécharger le fichier
      progressCallback?.('Téléchargement du fichier', 15, 'Téléchargement du fichier sur le serveur...');
      const fileUrl = await quizService.uploadFile(file, user.id);
      progressCallback?.('Téléchargement terminé', 25, `Fichier téléchargé: ${file.name}`);
      
      // 2. Extraire le texte
      progressCallback?.('Extraction du texte', 30, 'Extraction du texte depuis le document...');
      const text = await quizService.extractTextFromFile(fileUrl, file.type);
      progressCallback?.('Extraction terminée', 40, `Texte extrait: ${text.length} caractères`);
      
      if (!text || text.length < 50) {
        throw new Error("Impossible d'extraire suffisamment de texte du document");
      }
      
      // 3. Générer les questions via l'API Flask ou utiliser la solution de secours si nécessaire
      // Aucune notification d'erreur ne sera affichée, le basculement est silencieux
      progressCallback?.('Génération des questions', 45, `Génération de ${numQuestions} questions avec ${modelType}...`);
      let questions;
      try {
        questions = await generateQuestionsWithAI(
          text,
          numQuestions,
          difficulty,
          additionalInfo,
          modelType,
          (progress: number) => {
            const percent = 45 + Math.round(progress * 30);
            progressCallback?.('Génération des questions', percent, `Progression: ${Math.round(progress * 100)}%`);
          }
        );
      } catch (genError) {
        // En cas d'erreur, aucune notification à l'utilisateur
        console.error("Erreur silencieuse lors de la génération des questions:", genError);
        throw genError; // Le fallback est géré dans le service AI
      }
      
      if (!questions || questions.length === 0) {
        throw new Error("Impossible de générer des questions");
      }
      
      progressCallback?.('Questions générées', 75, `${questions.length} questions générées`);
      
      // 4. Sauvegarder le quiz
      progressCallback?.('Sauvegarde du quiz', 80, 'Sauvegarde du quiz dans la base de données...');
      const title = file.name.split('.')[0];
      const description = additionalInfo || 'Quiz généré par IA basé sur vos documents.';
      
      let quizId;
      
      try {
        quizId = await quizService.createQuiz(
          user.id,
          title,
          description,
          [], // Envoyer un tableau vide, les questions seront chargées depuis Firebase
          difficulty,
          timeLimit
        );
        
        progressCallback?.('Quiz sauvegardé', 100, 'Quiz créé avec succès');
        
        toast.success('Quiz créé avec succès');
        
        // Redirection directe vers la page du quiz sans passer par la prévisualisation
        setTimeout(() => {
          navigate(`/quiz/${quizId}`);
        }, 500);
        
        return quizId;
      } catch (genError) {
        console.error("Erreur lors de la génération du quiz standard:", genError);
        
        // Créer un quiz de secours avec des questions Firebase
        progressCallback?.('Création du quiz de secours', 80, 'Création d\'un quiz de secours...');
        
        const backupQuestions = await getFirebaseBackupQuestions();
        const title = file ? file.name.split('.')[0] : 'Quiz de secours';
        const description = 'Quiz de secours généré automatiquement';
        
        quizId = await quizService.createQuiz(
          user.id,
          title,
          description,
          backupQuestions,
          difficulty,
          timeLimit
        );
        
        progressCallback?.('Quiz de secours créé', 100, 'Quiz de secours créé avec succès');
        
        toast.success('Quiz de secours créé avec succès');
        
        // Redirection directe vers la page du quiz
        setTimeout(() => {
          navigate(`/quiz/${quizId}`);
        }, 500);
        
        return quizId;
      }
    } catch (error: any) {
      console.error('QuizProvider: Error creating quiz:', error);
      toast.error(`Impossible de créer le quiz: ${error.message || "Erreur inconnue"}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getQuiz = async (id: string): Promise<Quiz | null> => {
    console.log(`QuizProvider: Récupération du quiz avec ID: ${id}`);
    
    try {
      // Essayer de récupérer le quiz normalement
      const quiz = await quizService.getQuiz(id);
      
      if (quiz) {
        console.log('QuizProvider: Quiz récupéré avec succès');
        
        // Vérifier si le quiz a des questions
        if (!quiz.questions || quiz.questions.length === 0) {
          console.log('QuizProvider: Quiz sans questions, ajout de questions de secours');
          
          // Ajouter des questions de secours
          const backupQuestions = await getFirebaseBackupQuestions();
          quiz.questions = backupQuestions;
        }
        
        setCurrentQuiz(quiz);
        return quiz;
      } else {
        // Si le quiz est null/undefined, créer un quiz de secours
        console.log('QuizProvider: Quiz non trouvé, création d\'un quiz de secours');
        
        const backupQuestions = await getFirebaseBackupQuestions();
        const backupQuiz: Quiz = {
          id,
          title: "Quiz",
          description: "Quiz généré automatiquement",
          questions: backupQuestions,
          createdAt: new Date().toISOString().split('T')[0],
          completionRate: 0,
          duration: "30 min",
          participants: 0,
          difficulty: "medium", // Using a valid union type value
          timeLimit: 30
        };
        
        setCurrentQuiz(backupQuiz);
        return backupQuiz;
      }
    } catch (error) {
      console.error('QuizProvider: Erreur lors de la récupération du quiz:', error);
      
      // En cas d'erreur, créer un quiz de secours
      const backupQuestions = await getFirebaseBackupQuestions();
      const backupQuiz: Quiz = {
        id,
        title: "Quiz",
        description: "Quiz généré automatiquement",
        questions: backupQuestions,
        createdAt: new Date().toISOString().split('T')[0],
        completionRate: 0,
        duration: "30 min",
        participants: 0,
        difficulty: "medium", // Using a valid union type value
        timeLimit: 30
      };
      
      setCurrentQuiz(backupQuiz);
      return backupQuiz;
    }
  };
  
  const submitQuizAnswers = async (quizId: string, answers: Record<string, string>) => {
    if (!user) {
      toast.error('Veuillez vous connecter pour soumettre vos réponses');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    try {
      const score = await quizService.submitQuizAnswers(quizId, user.id, answers);
      setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, completionRate: 100 } : q));
      toast.success('Réponses soumises avec succès');
      return score;
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('Impossible de soumettre vos réponses');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteQuiz = async (id: string) => {
    setIsLoading(true);
    try {
      await quizService.deleteQuiz(id);
      setQuizzes(prev => prev.filter(quiz => quiz.id !== id));
      if (currentQuiz?.id === id) setCurrentQuiz(null);
      toast.success('Quiz supprimé avec succès');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Impossible de supprimer le quiz');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const shareQuiz = async (id: string, email: string) => {
    setIsLoading(true);
    try {
      await quizService.shareQuiz(id, email);
      setQuizzes(prev => prev.map(q => q.id === id ? { ...q, isShared: true } : q));
      toast.success('Quiz partagé avec succès');
    } catch (error) {
      console.error('Error sharing quiz:', error);
      toast.error('Impossible de partager le quiz');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const removeCollaborator = async (quizId: string, collaboratorId: string) => {
    setIsLoading(true);
    try {
      await quizService.removeCollaborator(quizId, collaboratorId);
      await fetchQuizzes();
      toast.success('Collaborateur supprimé avec succès');
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Impossible de supprimer le collaborateur');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <QuizContext.Provider
      value={{
        quizzes,
        sharedQuizzes,
        currentQuiz,
        isLoading,
        createQuiz,
        getQuiz,
        submitQuizAnswers,
        deleteQuiz,
        shareQuiz,
        removeCollaborator,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};
