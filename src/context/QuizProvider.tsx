
import { useState, useEffect, ReactNode } from 'react';
import QuizContext from './QuizContext';
import { Quiz } from '@/types/quiz';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import * as quizService from '@/services/quizService';

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
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
      const userQuizzes = await quizService.getQuizzes(user.id);
      setQuizzes(userQuizzes);
      
      const shared = await quizService.getSharedQuizzes(user.id);
      setSharedQuizzes(shared);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
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
    modelType: 'qwen' | 'gemini' = 'qwen'
  ): Promise<string> => {
    if (!user) {
      toast.error('Veuillez vous connecter pour créer un quiz');
      throw new Error('User not authenticated');
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Création de quiz: ${numQuestions} questions, difficulté: ${difficulty}, modèle: ${modelType}`);
      
      // 1. Télécharger le fichier
      const fileUrl = await quizService.uploadFile(file, user.id);
      console.log('Fichier téléchargé:', fileUrl);
      
      // 2. Extraire le texte
      const text = await quizService.extractTextFromFile(fileUrl, file.type);
      console.log(`Texte extrait: ${text.length} caractères`);
      
      if (!text || text.length < 50) {
        throw new Error("Impossible d'extraire suffisamment de texte du document");
      }
      
      // 3. Générer les questions
      console.log(`Génération de ${numQuestions} questions avec ${modelType}...`);
      const questions = await quizService.generateQuizQuestions(
        text,
        numQuestions,
        difficulty,
        additionalInfo,
        modelType
      );
      
      if (!questions || questions.length === 0) {
        throw new Error("Impossible de générer des questions");
      }
      
      console.log(`${questions.length} questions générées`);
      
      // 4. Sauvegarder le quiz
      const title = file.name.split('.')[0];
      const description = additionalInfo || 'Quiz généré par IA basé sur vos documents.';
      
      const quizId = await quizService.createQuiz(
        user.id,
        title,
        description,
        questions,
        difficulty,
        timeLimit
      );
      
      console.log(`Quiz créé: ${quizId}`);
      
      // 5. Récupérer le nouveau quiz
      const newQuiz = await quizService.getQuiz(quizId);
      
      if (newQuiz) {
        setQuizzes(prev => [newQuiz, ...prev]);
        setCurrentQuiz(newQuiz);
      }
      
      toast.success('Quiz créé avec succès');
      return quizId;
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      toast.error(`Impossible de créer le quiz: ${error.message || "Erreur inconnue"}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonctions simplifiées pour le contexte
  const getQuiz = async (id: string) => {
    setIsLoading(true);
    try {
      const quiz = await quizService.getQuiz(id);
      setCurrentQuiz(quiz);
      return quiz;
    } catch (error) {
      console.error('Error getting quiz:', error);
      toast.error('Impossible de récupérer le quiz');
      return null;
    } finally {
      setIsLoading(false);
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
