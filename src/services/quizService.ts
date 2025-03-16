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
import { AIService } from './aiService';
import { uploadFileToSupabase } from './storageService';

export const uploadFile = async (file: File, userId: string): Promise<string> => {
  try {
    // Utiliser Supabase Storage au lieu de Firebase Storage
    const fileUrl = await uploadFileToSupabase(file, userId);
    return fileUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

export const extractTextFromFile = async (fileUrl: string, fileType: string): Promise<string> => {
  try {
    // Appel à un service d'extraction de texte
    // Cette fonction pourrait utiliser un service comme Textract ou une API OCR pour extraire le texte
    // Pour la démonstration, simulons l'extraction
    console.log(`Extracting text from ${fileUrl} (${fileType})`);
    
    // Voici comment cela pourrait être implémenté avec une API réelle:
    const response = await fetch('https://api.example.com/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, fileType })
    });
    
    // Si l'API n'est pas disponible, simulons l'extraction
    if (!response.ok) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return "Contenu extrait du fichier (simulé pour la démonstration)";
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error extracting text:', error);
    // Si l'extraction échoue, retourner un texte par défaut pour la démonstration
    return "Contenu extrait du fichier (simulé pour la démonstration)";
  }
};

export const generateQuizFromText = async (
  text: string, 
  numQuestions: number, 
  additionalInfo?: string,
  apiKey?: string
): Promise<Question[]> => {
  try {
    if (apiKey) {
      // Utiliser OpenAI si une API key est fournie
      return await AIService.generateQuestionsWithOpenAI({
        text,
        numQuestions,
        additionalInfo,
        apiKey
      });
    } else {
      // Utiliser la génération locale sans API key
      return await AIService.generateQuestionsLocally({
        text,
        numQuestions,
        additionalInfo
      });
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error('Failed to generate quiz questions');
  }
};

export const createQuiz = async (
  userId: string, 
  title: string, 
  description: string, 
  questions: Question[]
): Promise<string> => {
  const quizData = {
    userId,
    title,
    description,
    questions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completionRate: 0,
    duration: `${Math.round(questions.length * 1.5)} min`,
    participants: 0,
    collaborators: [],
    isShared: false,
  };
  
  const docRef = await addDoc(collection(db, 'quizzes'), quizData);
  return docRef.id;
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
  
  // Remove fields that shouldn't be updated directly
  const { id, ...updateData } = updates;
  
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  const docRef = doc(db, 'quizzes', quizId);
  await deleteDoc(docRef);
};

export const shareQuiz = async (
  quizId: string, 
  collaboratorEmail: string
): Promise<void> => {
  // In a real app, you would:
  // 1. Look up the user by email
  // 2. Add their ID to the collaborators array
  // Here, we'll simulate this:
  
  const docRef = doc(db, 'quizzes', quizId);
  
  // For simulation purposes only - in a real app, get the actual userId
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
  
  // Check if there are any collaborators left
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
  
  // Calculate score
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
  
  // Store the result
  await addDoc(collection(db, 'quizResults'), {
    quizId,
    userId,
    answers,
    score,
    completedAt: serverTimestamp(),
  });
  
  // Update the quiz completion rate to 100%
  await updateDoc(quizRef, {
    participants: quizData.participants + 1,
    completionRate: 100,
  });
  
  return score;
};
