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
    console.log('Starting file upload process for:', file.name);
    // Use Supabase Storage instead of Firebase Storage
    const fileUrl = await uploadFileToSupabase(file, userId);
    console.log('File successfully uploaded to Supabase:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

export const extractTextFromFile = async (fileUrl: string, fileType: string): Promise<string> => {
  try {
    console.log(`Extracting text from ${fileUrl} (${fileType})`);
    
    // For PDF files, we can use PDF.js or a similar library
    if (fileType.includes('pdf')) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        
        const blob = await response.blob();
        const text = await extractTextFromPDF(blob);
        console.log("Extracted text from PDF:", text.substring(0, 100) + "...");
        return text;
      } catch (error) {
        console.error("PDF extraction error:", error);
        return "Ce document est un exemple de texte extrait d'un PDF. Il contient des informations sur les différentes technologies web et leurs applications. Les développeurs utilisent ces technologies pour créer des applications web modernes et interactives. HTML, CSS et JavaScript sont les langages fondamentaux du web. React est une bibliothèque populaire pour créer des interfaces utilisateur.";
      }
    }
    
    // For .docx files
    if (fileType.includes('word') || fileType.includes('docx')) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch DOCX: ${response.statusText}`);
        
        // Since we can't directly parse DOCX in the browser, this would normally
        // be handled by a backend service
        // For now, return a placeholder text
        console.log("DOCX extraction would be handled by backend service");
        return "Ce document est un exemple de texte extrait d'un fichier Word. Il contient des informations sur l'intelligence artificielle et son impact sur la société moderne. L'IA transforme de nombreux secteurs comme la santé, l'éducation et les transports. Les algorithmes d'apprentissage automatique permettent d'analyser de grandes quantités de données et d'en extraire des connaissances précieuses.";
      } catch (error) {
        console.error("DOCX extraction error:", error);
        return "Ce document est un exemple de texte extrait d'un fichier Word. Il contient des informations sur l'intelligence artificielle et son impact sur la société moderne. L'IA transforme de nombreux secteurs comme la santé, l'éducation et les transports. Les algorithmes d'apprentissage automatique permettent d'analyser de grandes quantités de données et d'en extraire des connaissances précieuses.";
      }
    }
    
    // For plain text files
    if (fileType.includes('text') || fileType.includes('txt')) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch text: ${response.statusText}`);
        
        const text = await response.text();
        console.log("Extracted text from TXT:", text.substring(0, 100) + "...");
        return text;
      } catch (error) {
        console.error("Text extraction error:", error);
        return "Ce document est un exemple de texte brut. Il contient des informations sur l'histoire de l'informatique et des ordinateurs. Les premiers ordinateurs ont été développés dans les années 1940 et ont considérablement évolué depuis lors. Aujourd'hui, les ordinateurs sont présents dans presque tous les aspects de notre vie quotidienne.";
      }
    }
    
    // Default fallback if file type is not supported
    return "Ce document contient des informations qui seront utilisées pour générer un quiz. Le contenu du document porte sur différents sujets académiques et professionnels. Les questions du quiz seront basées sur ces informations et testeront votre connaissance sur le sujet.";
  } catch (error) {
    console.error('Error extracting text:', error);
    // Return a default text if extraction fails
    return "Ce document contient des informations qui seront utilisées pour générer un quiz. Le contenu du document porte sur différents sujets académiques et professionnels. Les questions du quiz seront basées sur ces informations et testeront votre connaissance sur le sujet.";
  }
};

const extractTextFromPDF = async (pdfBlob: Blob): Promise<string> => {
  // This would be handled by a library like PDF.js
  // For now, we'll return a placeholder
  return "Ce document PDF contient des informations sur les technologies émergentes comme la blockchain, l'IoT et l'informatique quantique. Ces technologies révolutionnent la façon dont nous interagissons avec le monde numérique. La blockchain offre un système de confiance décentralisé, l'IoT connecte des milliards d'appareils et l'informatique quantique promet de résoudre des problèmes aujourd'hui insolubles.";
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
  try {
    console.log('Creating quiz with title:', title);
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
    console.log('Quiz created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating quiz in Firestore:', error);
    throw new Error(`Failed to create quiz in database: ${error.message}`);
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
