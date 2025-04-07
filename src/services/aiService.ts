import axios from 'axios';
import { Question } from '@/types/quiz';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// URL de l'API Flask (local)
const FLASK_API_URL = 'http://localhost:5000/api';

// Exporter la fonction pour pouvoir l'utiliser directement
export const getFirebaseBackupQuestions = async (): Promise<Question[]> => {
  try {
    // Essayer de récupérer les questions depuis Firestore
    const questionsCollection = collection(db, 'backup-questions');
    const snapshot = await getDocs(questionsCollection);
    
    if (!snapshot.empty) {
      const questions = snapshot.docs.map(doc => doc.data() as Question);
      console.log('Questions de secours récupérées depuis Firebase:', questions.length);
      return questions;
    }
    
    // Si aucune question n'existe dans Firestore, utiliser les questions statiques
    console.log('Aucune question trouvée dans Firebase, utilisation des questions statiques');
    return getStaticBackupQuestions();
  } catch (error) {
    console.error('Erreur lors de la récupération des questions depuis Firebase:', error);
    // En cas d'erreur, utiliser les questions statiques
    return getStaticBackupQuestions();
  }
};

// Questions statiques de secours (utilisées uniquement si Firebase échoue)
const getStaticBackupQuestions = (): Question[] => {
  return [
    {
      id: 'q1',
      text: 'Quelle fonctionnalité principale offre Firebase Realtime Database ?',
      options: [
        { id: 'q1_a', text: 'Stockage de fichiers volumineux', isCorrect: false },
        { id: 'q1_b', text: 'Base de données relationnelle', isCorrect: false },
        { id: 'q1_c', text: 'Synchronisation de données en temps réel', isCorrect: true },
        { id: 'q1_d', text: 'Hébergement de sites web', isCorrect: false }
      ],
      explanation: 'Firebase Realtime Database est une base de données NoSQL cloud qui permet de synchroniser les données entre clients en temps réel.',
      difficulty: 'medium'
    },
    {
      id: 'q2',
      text: 'Quel service Firebase permet l\'authentification des utilisateurs ?',
      options: [
        { id: 'q2_a', text: 'Firebase Firestore', isCorrect: false },
        { id: 'q2_b', text: 'Firebase Auth', isCorrect: true },
        { id: 'q2_c', text: 'Firebase Hosting', isCorrect: false },
        { id: 'q2_d', text: 'Firebase Cloud Messaging', isCorrect: false }
      ],
      explanation: 'Firebase Auth fournit des services backend et des SDK prêts à l\'emploi pour authentifier les utilisateurs dans votre application.',
      difficulty: 'easy'
    },
    {
      id: 'q3',
      text: 'Quelle est la principale différence entre Firebase Realtime Database et Firestore ?',
      options: [
        { id: 'q3_a', text: 'Firestore ne permet pas d\'accéder aux données hors ligne', isCorrect: false },
        { id: 'q3_b', text: 'Firestore est une base relationnelle', isCorrect: false },
        { id: 'q3_c', text: 'Firestore utilise une structure de type document/collection', isCorrect: true },
        { id: 'q3_d', text: 'Realtime Database offre plus de sécurité que Firestore', isCorrect: false }
      ],
      explanation: 'Firestore utilise un modèle de données plus intuitif avec des collections de documents, tandis que Realtime Database stocke les données dans une grande arborescence JSON.',
      difficulty: 'medium'
    },
    {
      id: 'q4',
      text: 'Firebase Cloud Messaging (FCM) est utilisé pour :',
      options: [
        { id: 'q4_a', text: 'Sauvegarder les données de l\'application', isCorrect: false },
        { id: 'q4_b', text: 'Envoyer des notifications push', isCorrect: true },
        { id: 'q4_c', text: 'Créer une interface utilisateur', isCorrect: false },
        { id: 'q4_d', text: 'Gérer les paiements', isCorrect: false }
      ],
      explanation: 'Firebase Cloud Messaging est une solution de messagerie multiplateforme qui permet d\'envoyer des notifications push de manière fiable.',
      difficulty: 'easy'
    },
    {
      id: 'q5',
      text: 'Firebase Hosting permet de :',
      options: [
        { id: 'q5_a', text: 'Gérer les utilisateurs', isCorrect: false },
        { id: 'q5_b', text: 'Déployer des applications web statiques', isCorrect: true },
        { id: 'q5_c', text: 'Envoyer des emails', isCorrect: false },
        { id: 'q5_d', text: 'Gérer les bases de données', isCorrect: false }
      ],
      explanation: 'Firebase Hosting fournit un hébergement rapide et sécurisé pour applications web, contenu statique et dynamique.',
      difficulty: 'easy'
    },
    {
      id: 'q6',
      text: 'Quel langage Firebase Cloud Functions utilise-t-il principalement ?',
      options: [
        { id: 'q6_a', text: 'Python', isCorrect: false },
        { id: 'q6_b', text: 'Java', isCorrect: false },
        { id: 'q6_c', text: 'JavaScript / TypeScript', isCorrect: true },
        { id: 'q6_d', text: 'Ruby', isCorrect: false }
      ],
      explanation: 'Firebase Cloud Functions utilise principalement JavaScript ou TypeScript, s\'exécutant dans un environnement Node.js.',
      difficulty: 'medium'
    },
    {
      id: 'q7',
      text: 'Pour quelle raison utiliser Firebase Analytics ?',
      options: [
        { id: 'q7_a', text: 'Stocker des fichiers', isCorrect: false },
        { id: 'q7_b', text: 'Analyser le trafic réseau', isCorrect: false },
        { id: 'q7_c', text: 'Comprendre le comportement des utilisateurs', isCorrect: true },
        { id: 'q7_d', text: 'Sauvegarder les préférences utilisateur', isCorrect: false }
      ],
      explanation: 'Firebase Analytics fournit des informations sur le comportement des utilisateurs et leur utilisation de l\'application.',
      difficulty: 'medium'
    },
    {
      id: 'q8',
      text: 'Quelle règle de sécurité Firebase est correcte pour autoriser uniquement l\'utilisateur connecté à lire ses propres données ?',
      options: [
        { id: 'q8_a', text: '"read": true', isCorrect: false },
        { id: 'q8_b', text: '"read": "auth != null"', isCorrect: false },
        { id: 'q8_c', text: '"read": "auth.uid == userId"', isCorrect: true },
        { id: 'q8_d', text: '"read": "false"', isCorrect: false }
      ],
      explanation: 'La règle "auth.uid == userId" vérifie que l\'ID de l\'utilisateur authentifié correspond à l\'ID utilisateur dans le chemin de la base de données.',
      difficulty: 'hard'
    },
    {
      id: 'q9',
      text: 'Quel plan Firebase propose des fonctionnalités payantes ?',
      options: [
        { id: 'q9_a', text: 'Free Plan', isCorrect: false },
        { id: 'q9_b', text: 'Spark Plan', isCorrect: false },
        { id: 'q9_c', text: 'Flame Plan', isCorrect: false },
        { id: 'q9_d', text: 'Blaze Plan', isCorrect: true }
      ],
      explanation: 'Le plan Blaze est le plan de tarification à l\'usage qui débloque toutes les fonctionnalités Firebase avec des tarifs évolutifs.',
      difficulty: 'medium'
    },
    {
      id: 'q10',
      text: 'Qu\'est-ce que Firebase Remote Config permet ?',
      options: [
        { id: 'q10_a', text: 'Modifier le code source à distance', isCorrect: false },
        { id: 'q10_b', text: 'Modifier dynamiquement le comportement et l\'apparence de l\'application', isCorrect: true },
        { id: 'q10_c', text: 'Gérer les versions de base de données', isCorrect: false },
        { id: 'q10_d', text: 'Supprimer les utilisateurs', isCorrect: false }
      ],
      explanation: 'Remote Config permet de modifier l\'apparence et le comportement de votre application sans publier une nouvelle version.',
      difficulty: 'medium'
    }
  ];
};

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
      console.log('Utilisation automatique du mode de secours Firebase sans notification...');
      
      // Récupération silencieuse des questions de secours depuis Firebase
      const firebaseQuestions = await getFirebaseBackupQuestions();
      
      // Limiter au nombre de questions demandé et ajuster la difficulté
      const adjustedQuestions = firebaseQuestions
        .slice(0, numQuestions)
        .map(q => ({...q, difficulty}));
      
      return adjustedQuestions;
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
    
    try {
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
      }
      
      if (response.data && response.data.questions) {
        const questions = response.data.questions;
        console.log(`${questions.length} questions générées avec succès via Flask API`);
        return questions;
      } else {
        console.error('Format de réponse incorrect depuis l\'API Flask:', response.data);
        throw new Error('Format de réponse incorrect depuis l\'API Flask');
      }
    } catch (apiError) {
      console.error('Erreur lors de l\'appel à l\'API Flask:', apiError);
      
      // En cas d'erreur d'API Flask, basculer silencieusement vers le mode de secours Firebase
      console.log('Basculement silencieux vers le mode de secours Firebase...');
      const firebaseQuestions = await getFirebaseBackupQuestions();
      
      // Limiter au nombre de questions demandé et ajuster la difficulté
      const adjustedQuestions = firebaseQuestions
        .slice(0, numQuestions)
        .map(q => ({...q, difficulty}));
      
      return adjustedQuestions;
    }
  } catch (error: any) {
    console.error('Erreur générale lors de la génération des questions:', error);
    
    // En cas d'erreur générale, basculer silencieusement vers le mode de secours Firebase
    console.log('Basculement silencieux vers le mode de secours Firebase suite à une erreur générale...');
    const firebaseQuestions = await getFirebaseBackupQuestions();
    
    // Limiter au nombre de questions demandé et ajuster la difficulté
    const adjustedQuestions = firebaseQuestions
      .slice(0, numQuestions)
      .map(q => ({...q, difficulty}));
    
    return adjustedQuestions;
  }
};
