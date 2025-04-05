
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
    
    // Vérification de connexion avec le serveur Flask
    try {
      const healthCheck = await axios.get(`${FLASK_API_URL}/health`, { timeout: 5000 });
      console.log('Statut du serveur Flask:', healthCheck.data);
    } catch (healthError) {
      console.error('Le serveur Flask semble être inaccessible:', healthError);
      throw new Error('Le serveur Flask est indisponible. Veuillez vérifier que le serveur Python est en cours d\'exécution sur http://localhost:5000');
    }
    
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
      timeout: 120000 // 120 secondes - augmenté pour les grands documents
    });
    
    if (response.data && response.data.questions) {
      console.log(`${response.data.questions.length} questions générées avec succès`);
      return response.data.questions;
    }
    
    console.error('Format de réponse incorrect depuis l\'API Python:', response.data);
    throw new Error('Format de réponse incorrect depuis l\'API Python');
  } catch (error) {
    console.error('Erreur lors de la génération des questions avec Qwen:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error('Impossible de se connecter au serveur Flask. Vérifiez que le serveur Python est en cours d\'exécution.');
        throw new Error('Impossible de se connecter au serveur Flask. Vérifiez que le serveur Python est en cours d\'exécution.');
      }
      if (error.response) {
        console.error('Détails de l\'erreur:', error.response.data);
      }
    }
    throw new Error('Échec de la génération des questions avec Qwen');
  }
};
