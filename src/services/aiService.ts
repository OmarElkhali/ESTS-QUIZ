
import axios from 'axios';
import { Question } from '@/types/quiz';

const FLASK_API_URL = 'http://localhost:5000/api'; 
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyAzFO0MGD9VlAHSIUyrxuhlAAltmoxT5uE';

export const generateQuestionsWithQwen = async (
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string,
  progressCallback?: (progress: number) => void
): Promise<Question[]> => {
  try {
    console.log(`Génération de ${numQuestions} questions avec Qwen...`);
    progressCallback?.(0.1);
    
    // Tentative via l'API Flask
    let questions: Question[] = [];
    try {
      // Vérification de connexion avec le serveur Flask
      progressCallback?.(0.2);
      try {
        const healthCheck = await axios.get(`${FLASK_API_URL}/health`, { timeout: 5000 });
        console.log('Statut du serveur Flask:', healthCheck.data);
      } catch (healthError) {
        console.warn('Le serveur Flask est inaccessible, utilisation du plan B (Supabase Function)');
        throw new Error('Serveur Flask inaccessible');
      }
      
      // Création de la requête vers l'API Python
      progressCallback?.(0.3);
      const response = await axios.post(`${FLASK_API_URL}/generate`, {
        text,
        numQuestions,
        difficulty,
        additionalInfo
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 120 secondes
      });
      
      if (response.data && response.data.questions) {
        console.log(`${response.data.questions.length} questions générées avec succès via Flask`);
        questions = response.data.questions;
        return questions;
      }
      
      throw new Error('Format de réponse incorrect depuis l\'API Python');
    } catch (flaskError) {
      console.warn('Échec de l\'API Flask, tentative avec la Supabase Function:', flaskError);
      progressCallback?.(0.4);
      
      // Plan B: Utiliser la fonction Supabase
      try {
        const response = await axios.post('https://urgqkhmasmedgshizrxb.supabase.co/functions/v1/generate-with-qwen', {
          text: text.substring(0, 15000), // Limiter la taille pour éviter les problèmes de contexte
          numQuestions,
          difficulty,
          additionalInfo
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 3 minutes
        });
        
        progressCallback?.(0.8);
        
        if (response.data && response.data.questions) {
          console.log(`${response.data.questions.length} questions générées avec succès via Supabase Function`);
          questions = response.data.questions;
          return questions;
        }
        
        throw new Error('Format de réponse incorrect depuis la fonction Supabase');
      } catch (supabaseError) {
        console.error('Échec de la fonction Supabase:', supabaseError);
        
        // Plan C: Questions de secours
        questions = generateFallbackQuestions(numQuestions, difficulty);
        console.log('Utilisation de questions de secours en raison des erreurs API');
        return questions;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des questions avec Qwen:', error);
    throw new Error('Échec de la génération des questions avec Qwen');
  }
};

export const generateQuestionsWithGemini = async (
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string,
  progressCallback?: (progress: number) => void
): Promise<Question[]> => {
  try {
    console.log(`Génération de ${numQuestions} questions avec Gemini...`);
    progressCallback?.(0.1);
    
    // Tentative via l'API Gemini directe
    let questions: Question[] = [];
    try {
      progressCallback?.(0.3);
      
      // Construire le prompt pour Gemini
      const prompt = `
        Génère ${numQuestions} questions de quiz QCM en français basées sur le texte fourni.
        Niveau de difficulté: ${difficulty}
        
        Texte: """${text.substring(0, 15000)}"""
        
        ${additionalInfo ? `Informations supplémentaires: ${additionalInfo}` : ''}
        
        INSTRUCTIONS:
        1. Chaque question doit provenir directement du texte fourni
        2. Les questions doivent être diverses et couvrir différents aspects du texte
        3. Pour chaque question, crée 4 options avec UNE SEULE réponse correcte
        4. Niveau ${difficulty}: ${
          difficulty === 'easy' 
            ? 'questions basiques testant la compréhension générale' 
            : difficulty === 'medium' 
              ? 'questions plus nuancées nécessitant une bonne compréhension' 
              : 'questions complexes nécessitant une analyse approfondie'
        }
        5. Fournis une explication claire pour chaque réponse correcte
        
        FORMAT DE RÉPONSE:
        Tu dois fournir un tableau JSON valide contenant les questions comme ceci:
        
        [
          {
            "id": "q1",
            "text": "Question 1?",
            "options": [
              {"id": "q1_a", "text": "Option A", "isCorrect": false},
              {"id": "q1_b", "text": "Option B", "isCorrect": true},
              {"id": "q1_c", "text": "Option C", "isCorrect": false},
              {"id": "q1_d", "text": "Option D", "isCorrect": false}
            ],
            "explanation": "Explication pourquoi B est correct",
            "difficulty": "${difficulty}"
          }
        ]
      `;
      
      progressCallback?.(0.4);
      
      // Tentative directe avec l'API Gemini
      try {
        const geminiResponse = await axios.post(
          GEMINI_API_URL,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              topK: 40
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GEMINI_API_KEY
            },
            timeout: 120000
          }
        );
        
        progressCallback?.(0.7);
        
        let content = '';
        if (geminiResponse.data.candidates && 
            geminiResponse.data.candidates.length > 0 && 
            geminiResponse.data.candidates[0].content && 
            geminiResponse.data.candidates[0].content.parts && 
            geminiResponse.data.candidates[0].content.parts.length > 0) {
          content = geminiResponse.data.candidates[0].content.parts[0].text;
        } else {
          throw new Error('Format de réponse Gemini inattendu');
        }
        
        // Tentative d'extraire le JSON de la réponse
        try {
          // Recherche d'un tableau JSON dans la chaîne
          const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
            
            // Valider et normaliser les questions
            questions = validateAndNormalizeQuestions(questions, numQuestions, difficulty);
            
            console.log(`${questions.length} questions générées avec succès via Gemini Direct`);
            return questions;
          } else {
            throw new Error('Aucun tableau JSON trouvé dans la réponse Gemini');
          }
        } catch (parseError) {
          console.error('Erreur lors du parsing de la réponse Gemini:', parseError);
          throw new Error('Erreur de parsing de la réponse Gemini');
        }
      } catch (directGeminiError) {
        console.warn('Échec avec l\'API Gemini directe:', directGeminiError);
        throw new Error(`Erreur API Gemini (${directGeminiError.response?.status || 'inconnu'}): ${directGeminiError.message}`);
      }
    } catch (geminiError) {
      console.warn('Tentative avec la fonction Supabase pour Gemini:', geminiError);
      progressCallback?.(0.5);
      
      // Plan B: Utiliser la fonction Supabase pour Gemini
      try {
        const response = await axios.post('https://urgqkhmasmedgshizrxb.supabase.co/functions/v1/generate-questions', {
          text: text.substring(0, 15000), // Limiter la taille pour éviter les problèmes de contexte
          numQuestions,
          difficulty,
          additionalInfo
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 3 minutes
        });
        
        progressCallback?.(0.8);
        
        if (response.data && response.data.questions) {
          console.log(`${response.data.questions.length} questions générées avec succès via Supabase Function pour Gemini`);
          questions = response.data.questions;
          return questions;
        }
        
        throw new Error('Format de réponse incorrect depuis la fonction Supabase');
      } catch (supabaseError) {
        console.error('Échec de la fonction Supabase pour Gemini:', supabaseError);
        
        // Plan C: Tenter avec Qwen en dernier recours
        try {
          console.log('Tentative avec Qwen en secours');
          progressCallback?.(0.6);
          return await generateQuestionsWithQwen(text, numQuestions, difficulty, additionalInfo);
        } catch (qwenFallbackError) {
          console.error('Échec du fallback Qwen:', qwenFallbackError);
          
          // Plan D: Questions de secours
          questions = generateFallbackQuestions(numQuestions, difficulty);
          console.log('Utilisation de questions de secours en raison des erreurs API');
          return questions;
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des questions avec Gemini:', error);
    throw new Error(`Échec de la génération avec Gemini: ${error.message}`);
  }
};

// Fonction pour valider et normaliser les questions
const validateAndNormalizeQuestions = (
  questions: any[], 
  numQuestionsRequested: number,
  difficulty: 'easy' | 'medium' | 'hard'
): Question[] => {
  if (!Array.isArray(questions)) {
    return generateFallbackQuestions(numQuestionsRequested, difficulty);
  }
  
  // Limiter au nombre demandé
  const limitedQuestions = questions.slice(0, numQuestionsRequested);
  
  // Normaliser chaque question
  return limitedQuestions.map((q, index) => {
    const questionId = q.id || `q${index + 1}`;
    
    // Normaliser les options
    let options = Array.isArray(q.options) ? q.options : [];
    if (options.length < 2) {
      options = [
        { id: `${questionId}_a`, text: "Option A", isCorrect: true },
        { id: `${questionId}_b`, text: "Option B", isCorrect: false },
        { id: `${questionId}_c`, text: "Option C", isCorrect: false },
        { id: `${questionId}_d`, text: "Option D", isCorrect: false }
      ];
    } else {
      options = options.map((o, optIndex) => ({
        id: o.id || `${questionId}_${String.fromCharCode(97 + optIndex)}`,
        text: o.text || `Option ${String.fromCharCode(65 + optIndex)}`,
        isCorrect: Boolean(o.isCorrect)
      }));
    }
    
    // S'assurer qu'il y a exactement une bonne réponse
    const correctOptions = options.filter(o => o.isCorrect);
    if (correctOptions.length !== 1) {
      options[0].isCorrect = true;
      for (let i = 1; i < options.length; i++) {
        options[i].isCorrect = false;
      }
    }
    
    return {
      id: questionId,
      text: q.text || `Question ${index + 1}?`,
      options,
      explanation: q.explanation || "Aucune explication fournie.",
      difficulty: q.difficulty || difficulty
    };
  });
};

// Générer des questions de secours en cas d'échec de toutes les API
const generateFallbackQuestions = (numQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): Question[] => {
  const questions: Question[] = [];
  
  for (let i = 0; i < numQuestions; i++) {
    const qId = `q${i+1}`;
    questions.push({
      id: qId,
      text: `Question ${i+1} sur le document (générée automatiquement en mode secours)`,
      options: [
        { id: `${qId}_a`, text: "Première option", isCorrect: true },
        { id: `${qId}_b`, text: "Deuxième option", isCorrect: false },
        { id: `${qId}_c`, text: "Troisième option", isCorrect: false },
        { id: `${qId}_d`, text: "Quatrième option", isCorrect: false }
      ],
      explanation: "Cette question a été générée automatiquement suite à un problème technique. Les réponses ne reflètent pas nécessairement le contenu du document.",
      difficulty
    });
  }
  
  return questions;
};
