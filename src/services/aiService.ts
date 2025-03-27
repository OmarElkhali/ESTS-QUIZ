
import { Question } from '@/types/quiz';

interface AIServiceOptions {
  text: string;
  numQuestions: number;
  additionalInfo?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface OpenAIOptions extends AIServiceOptions {
  apiKey: string;
}

export const AIService = {
  generateQuestionsWithOpenAI: async (options: OpenAIOptions): Promise<Question[]> => {
    const { text, numQuestions, additionalInfo, apiKey, difficulty = 'medium' } = options;
    
    try {
      console.log(`Generating ${numQuestions} ${difficulty} questions with OpenAI from text: ${text.substring(0, 100)}...`);
      
      // Simulation d'un appel API pour le développement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      throw new Error('Failed to generate questions with OpenAI');
    }
  },
  
  generateQuestionsLocally: async (options: AIServiceOptions): Promise<Question[]> => {
    const { text, numQuestions, additionalInfo, difficulty = 'medium' } = options;
    
    try {
      console.log(`Generating ${numQuestions} ${difficulty} questions locally from text: ${text.substring(0, 100)}...`);
      
      // Simulation du temps de traitement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
    } catch (error) {
      console.error('Error generating questions locally:', error);
      throw new Error('Failed to generate questions locally');
    }
  }
};

// Fonction améliorée pour générer des questions basées sur le contenu du texte
function generateQuestionsFromText(
  text: string, 
  numQuestions: number, 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Question[] {
  const questions: Question[] = [];
  
  // Extraire des mots clés et phrases significatives du texte
  const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const words = text.split(/\s+/).filter(word => word.length > 5);
  const uniqueWords = [...new Set(words)];
  
  // Ajuster le format des questions selon la difficulté
  const complexityFactor = difficulty === 'easy' ? 1 : (difficulty === 'medium' ? 2 : 3);
  
  // Créer des types de questions variés
  const questionTypes = [
    "Selon le texte, quelle est la définition de",
    "D'après le document, quel concept est associé à",
    "Que signifie le terme suivant dans le contexte du document",
    "Quelle est l'idée principale concernant",
    "Comment le document décrit-il",
  ];
  
  for (let i = 0; i < numQuestions; i++) {
    const id = `q${i + 1}`;
    let questionText = "";
    
    // Générer une question basée sur le contenu réel du document
    if (sentences.length > i) {
      const sentence = sentences[i % sentences.length].trim();
      const sentenceWords = sentence.split(/\s+/).filter(word => word.length > 4);
      
      if (sentenceWords.length > 2) {
        // Choisir un mot clé de la phrase pour construire la question
        const keyWord = sentenceWords[Math.floor(Math.random() * sentenceWords.length)];
        const questionType = questionTypes[i % questionTypes.length];
        
        if (difficulty === 'easy') {
          questionText = `${questionType} "${keyWord}" ?`;
        } else if (difficulty === 'medium') {
          questionText = `Dans le contexte suivant: "${sentence.substring(0, 50)}...", ${questionType.toLowerCase()} "${keyWord}" ?`;
        } else {
          // Questions difficiles - analyse et synthèse
          const paragraph = paragraphs[i % paragraphs.length] || sentence;
          questionText = `En analysant ce passage: "${paragraph.substring(0, 100)}...", ${questionType.toLowerCase()} "${keyWord}" et quelles en sont les implications ?`;
        }
      } else {
        questionText = `Quelle information est correcte concernant "${sentence.substring(0, 30)}..." ?`;
      }
    } else {
      // Questions de secours si pas assez de phrases
      const topic = uniqueWords[i % uniqueWords.length] || "ce sujet";
      questionText = `Que dit le document à propos de "${topic}" ?`;
    }
    
    // Générer des options avec une réponse correcte
    const options = [];
    const correctOptionIndex = Math.floor(Math.random() * 4);
    
    // Extraire des informations du texte pour créer des options réalistes
    for (let j = 0; j < 4; j++) {
      const optionId = `${id}_${String.fromCharCode(97 + j)}`;
      const isCorrect = j === correctOptionIndex;
      
      let optionText = "";
      const startIndex = (i * 20 + j * 5) % Math.max(text.length - 100, 1);
      const textSegment = text.substring(startIndex, startIndex + 100);
      const segmentWords = textSegment.split(/\s+/).filter(word => word.length > 3);
      
      if (segmentWords.length > 3) {
        if (isCorrect) {
          // Option correcte - basée sur le contenu réel
          if (difficulty === 'easy') {
            optionText = segmentWords.slice(0, 3 + complexityFactor).join(' ');
          } else if (difficulty === 'medium') {
            optionText = segmentWords.slice(0, 5 + complexityFactor).join(' ');
          } else {
            optionText = segmentWords.slice(0, 7 + complexityFactor).join(' ');
          }
        } else {
          // Options incorrectes - variantes plausibles mais fausses
          const offset = (j * 10) % Math.max(segmentWords.length - 5, 1);
          if (difficulty === 'easy') {
            optionText = segmentWords.slice(offset, offset + 3).join(' ');
          } else if (difficulty === 'medium') {
            optionText = segmentWords.slice(offset, offset + 4).join(' ') + (Math.random() > 0.5 ? ' (incorrect)' : '');
          } else {
            // Options trompeuses pour les questions difficiles
            optionText = segmentWords.slice(offset, offset + 5).join(' ') + ' mais ' + segmentWords.slice((offset + 7) % segmentWords.length, (offset + 10) % segmentWords.length).join(' ');
          }
        }
      } else {
        // Options de secours
        optionText = isCorrect 
          ? `Réponse correcte pour la question ${i + 1}` 
          : `Option incorrecte ${j + 1} pour la question ${i + 1}`;
      }
      
      options.push({
        id: optionId,
        text: optionText,
        isCorrect
      });
    }
    
    // Créer une explication basée sur la réponse correcte
    const correctOption = options[correctOptionIndex];
    let explanation = `La réponse correcte est "${correctOption.text}"`;
    
    if (difficulty === 'easy') {
      explanation += ` car cette information apparaît directement dans le document.`;
    } else if (difficulty === 'medium') {
      explanation += ` car en analysant le contenu du document, on peut identifier cette information comme étant exacte.`;
    } else {
      explanation += ` car en synthétisant les informations présentées dans le document, on peut déduire cette conclusion qui s'aligne avec les concepts abordés.`;
    }
    
    questions.push({
      id,
      text: questionText,
      options,
      explanation,
      difficulty
    });
  }
  
  return questions;
}
