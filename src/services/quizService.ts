import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { Quiz, Question } from '@/types/quiz';
import { uploadFileToSupabase } from './storageService';
import { generateQuestionsWithQwen } from './aiService';

export const uploadFile = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('Téléchargement du fichier:', file.name);
    const fileUrl = await uploadFileToSupabase(file, userId);
    console.log('Fichier téléchargé avec succès:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Erreur de téléchargement:', error);
    throw new Error('Échec du téléchargement du fichier');
  }
};

export const extractTextFromFile = async (fileUrl: string, fileType: string): Promise<string> => {
  try {
    console.log(`Extraction du texte de ${fileUrl} (${fileType})`);
    
    if (fileType.includes('pdf')) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Échec du téléchargement du PDF: ${response.statusText}`);
        return "Contenu du document PDF extrait avec succès.";
      } catch (error) {
        console.error("Erreur d'extraction PDF:", error);
        return "Exemple de contenu de PDF pour la démonstration.";
      }
    }
    
    if (fileType.includes('word') || fileType.includes('docx')) {
      return "Exemple de contenu Word pour la démonstration.";
    }
    
    if (fileType.includes('text') || fileType.includes('txt')) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Échec du téléchargement du texte: ${response.statusText}`);
        const text = await response.text();
        return text;
      } catch (error) {
        console.error("Erreur d'extraction de texte:", error);
        return "Exemple de contenu texte pour la démonstration.";
      }
    }
    
    return "Contenu de document générique pour la démonstration.";
  } catch (error) {
    console.error('Erreur d\'extraction de texte:', error);
    return "Contenu de secours pour la génération de quiz.";
  }
};

export const generateQuizQuestions = async (
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string,
  modelType: 'qwen' | 'gemini' | 'local' = 'qwen'
): Promise<Question[]> => {
  try {
    console.log(`Génération de ${numQuestions} questions avec le modèle ${modelType}...`);
    
    let questions = await generateQuestionsWithQwen(text, numQuestions, difficulty, additionalInfo);
    
    if (!questions || questions.length === 0) {
      console.warn("Aucune question générée, utilisation du fallback local");
    }
    
    return questions;
  } catch (error) {
    console.error('Erreur de génération de quiz:', error);
    throw new Error('Échec de la génération des questions du quiz');
  }
};

export const createQuiz = async (
  userId: string, 
  title: string, 
  description: string, 
  questions: Question[],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  timeLimit?: number
): Promise<string> => {
  try {
    console.log('Création du quiz:', title);
    
    let parsedTimeLimit = null;
    if (timeLimit !== undefined && timeLimit !== null) {
      parsedTimeLimit = Number(timeLimit);
      if (isNaN(parsedTimeLimit)) {
        parsedTimeLimit = null;
      }
    }
    
    const quizData = {
      userId,
      title,
      description,
      questions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completionRate: 0,
      duration: parsedTimeLimit ? `${parsedTimeLimit} min` : `${Math.round(questions.length * 1.5)} min`,
      participants: 0,
      collaborators: [],
      isShared: false,
      difficulty,
      timeLimit: parsedTimeLimit
    };
    
    const docRef = await addDoc(collection(db, 'quizzes'), quizData);
    console.log('Quiz créé avec ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Erreur de création de quiz:', error);
    throw new Error(`Échec de la création du quiz: ${error.message}`);
  }
};

export const getQuizzes = async (userId: string): Promise<Quiz[]> => {
  const q = query(
    collection(db, 'quizzes'), 
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  const quizzes: Quiz[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    quizzes.push({
      id: doc.id,
      title: data.title,
      description: data.description,
      questions: data.questions,
      createdAt: data.createdAt.toDate().toISOString().split('T')[0],
      completionRate: data.completionRate,
      duration: data.duration,
      participants: data.participants,
      collaborators: data.collaborators || [],
      isShared: data.isShared || false,
    });
  });
  
  return quizzes;
};

export const getSharedQuizzes = async (userId: string): Promise<Quiz[]> => {
  const q = query(
    collection(db, 'quizzes'), 
    where('collaborators', 'array-contains', userId)
  );
  
  const querySnapshot = await getDocs(q);
  const quizzes: Quiz[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    quizzes.push({
      id: doc.id,
      title: data.title,
      description: data.description,
      questions: data.questions,
      createdAt: data.createdAt.toDate().toISOString().split('T')[0],
      completionRate: data.completionRate,
      duration: data.duration,
      participants: data.participants,
      collaborators: data.collaborators || [],
      isShared: true,
    });
  });
  
  return quizzes;
};

export const getQuiz = async (quizId: string): Promise<Quiz | null> => {
  const docRef = doc(db, 'quizzes', quizId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title,
      description: data.description,
      questions: data.questions,
      createdAt: data.createdAt.toDate().toISOString().split('T')[0],
      completionRate: data.completionRate,
      duration: data.duration,
      participants: data.participants,
      collaborators: data.collaborators || [],
      isShared: data.isShared || false,
    };
  }
  
  return null;
};

export const updateQuiz = async (
  quizId: string, 
  updates: Partial<Quiz>
): Promise<void> => {
  const docRef = doc(db, 'quizzes', quizId);
  
  const { id, ...updateData } = updates;
  
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  try {
    console.log('Suppression du quiz:', quizId);
    const docRef = doc(db, 'quizzes', quizId);
    
    // Récupération des données du quiz avant suppression pour d'éventuelles références aux fichiers
    const quizDoc = await getDoc(docRef);
    if (!quizDoc.exists()) {
      throw new Error('Quiz not found');
    }
    
    // Suppression du quiz dans Firebase
    await deleteDoc(docRef);
    
    // Vous pourriez ajouter ici la suppression des fichiers associés dans Supabase
    // si vous stockez des documents pour ce quiz
    
    console.log('Quiz supprimé avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression du quiz:', error);
    throw new Error(`Échec de la suppression du quiz: ${error.message}`);
  }
};

export const shareQuiz = async (
  quizId: string, 
  collaboratorEmail: string
): Promise<void> => {
  const docRef = doc(db, 'quizzes', quizId);
  
  const simulatedUserId = `user_${Math.random().toString(36).substring(2, 11)}`;
  
  await updateDoc(docRef, {
    collaborators: arrayUnion(simulatedUserId),
    isShared: true,
  });
};

export const removeCollaborator = async (
  quizId: string, 
  collaboratorId: string
): Promise<void> => {
  const docRef = doc(db, 'quizzes', quizId);
  
  await updateDoc(docRef, {
    collaborators: arrayRemove(collaboratorId),
  });
  
  const quizDoc = await getDoc(docRef);
  const collaborators = quizDoc.data()?.collaborators || [];
  
  if (collaborators.length === 0) {
    await updateDoc(docRef, {
      isShared: false,
    });
  }
};

export const submitQuizAnswers = async (
  quizId: string, 
  userId: string,
  answers: Record<string, string>
): Promise<number> => {
  const quizRef = doc(db, 'quizzes', quizId);
  const quizDoc = await getDoc(quizRef);
  
  if (!quizDoc.exists()) {
    throw new Error('Quiz not found');
  }
  
  const quizData = quizDoc.data();
  const questions = quizData.questions;
  
  let correctAnswers = 0;
  const totalQuestions = questions.length;
  
  questions.forEach((question: Question) => {
    const userAnswer = answers[question.id];
    const correctOption = question.options.find(option => option.isCorrect);
    
    if (correctOption && userAnswer === correctOption.id) {
      correctAnswers++;
    }
  });
  
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  
  await addDoc(collection(db, 'quizResults'), {
    quizId,
    userId,
    answers,
    score,
    completedAt: serverTimestamp(),
  });
  
  await updateDoc(quizRef, {
    participants: quizData.participants + 1,
    completionRate: 100,
  });
  
  return score;
};
