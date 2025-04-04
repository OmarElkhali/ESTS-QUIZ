
import axios from 'axios';
import { Question } from '@/types/quiz';

const FLASK_API_URL = 'http://localhost:5000/api'; 
// URL de l'API Flask - à ajuster selon votre environnement de déploiement

export const generateQuestionsWithQwen = async (
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Promise<Question[]> => {
  try {
    console.log(`Appel de l'API Flask pour générer ${numQuestions} questions avec Qwen...`);
    
    // Création de la requête vers l'API Python
    const response = await axios.post(`${FLASK_API_URL}/generate`, {
      text,
      numQuestions,
      difficulty,
      additionalInfo
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 secondes - augmenter si nécessaire pour les grands documents
    });
    
    if (response.data && response.data.questions) {
      console.log(`${response.data.questions.length} questions générées avec succès`);
      return response.data.questions;
    }
    
    console.error('Format de réponse incorrect depuis l\'API Python:', response.data);
    throw new Error('Format de réponse incorrect depuis l\'API Python');
  } catch (error) {
    console.error('Erreur lors de la génération des questions avec Qwen:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    throw new Error('Échec de la génération des questions avec Qwen');
  }
};
