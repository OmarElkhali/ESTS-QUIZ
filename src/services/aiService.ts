
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
      console.log('Vérification de l\'état du serveur Flask...');
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
      numQuestions,
      difficulty,
      additionalInfo,
      modelType,
      textLength: text.length
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
    
    // Vérification de la présence d'un avertissement dans la réponse
    if (response.data && response.data.warning) {
      console.warn('Avertissement depuis l\'API Flask:', response.data.warning);
      toast.warning('Le quiz a été généré en mode secours en raison de problèmes techniques.');
    }
    
    if (response.data && response.data.questions) {
      const questions = response.data.questions;
      console.log(`${questions.length} questions générées avec succès via Flask API`);
      return questions;
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
      
      // Si l'erreur est liée à OpenRouter (401), ajoutez un message plus précis
      if (error.response?.status === 500 && error.response?.data?.error?.includes('OpenRouter: 401')) {
        toast.error('Erreur d\'authentification avec OpenRouter. Vérifiez la clé API.');
        throw new Error('Erreur d\'authentification avec OpenRouter. Vérifiez la clé API.');
      }
    }
    throw new Error(`Échec de la génération des questions via Flask: ${error.message}`);
  }
};
