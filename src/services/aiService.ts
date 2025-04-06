
import axios from 'axios';
import { Question } from '@/types/quiz';
import { toast } from 'sonner';

// URL de l'API Flask (local)
const FLASK_API_URL = 'http://localhost:5000/api';

export const generateQuestionsWithAI = async (
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string,
  modelType: 'qwen' | 'gemini' = 'qwen',
  progressCallback?: (progress: number) => void
): Promise<Question[]> => {
  try {
    console.log(`Génération de ${numQuestions} questions avec ${modelType} via Flask API...`);
    progressCallback?.(0.1);
    
    // Vérification de l'état du serveur Flask
    try {
      progressCallback?.(0.2);
      const healthCheck = await axios.get(`${FLASK_API_URL}/health`, { timeout: 5000 });
      console.log('Statut du serveur Flask:', healthCheck.data);
    } catch (healthError) {
      console.error('Le serveur Flask est inaccessible:', healthError);
      toast.error('Le serveur Flask est inaccessible. Vérifiez que le serveur est démarré.');
      throw new Error('Serveur Flask inaccessible. Vérifiez que python_api/app.py est en cours d\'exécution.');
    }
    
    // Création de la requête vers l'API Flask
    progressCallback?.(0.3);
    console.log('Envoi des données au serveur Flask:', {
      text: text.substring(0, 100) + '...',
      numQuestions,
      difficulty,
      additionalInfo,
      modelType
    });
    
    const response = await axios.post(`${FLASK_API_URL}/generate`, {
      text,
      numQuestions,
      difficulty,
      additionalInfo,
      modelType
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3 minutes
    });
    
    progressCallback?.(0.8);
    
    if (response.data && response.data.questions) {
      console.log(`${response.data.questions.length} questions générées avec succès via Flask API`);
      return response.data.questions;
    } else {
      console.error('Format de réponse incorrect depuis l\'API Flask:', response.data);
      throw new Error('Format de réponse incorrect depuis l\'API Flask');
    }
  } catch (error: any) {
    console.error('Erreur lors de la génération des questions via Flask:', error);
    if (axios.isAxiosError(error)) {
      console.error('Détails de l\'erreur Axios:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
    throw new Error(`Échec de la génération des questions via Flask: ${error.message}`);
  }
};
