
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
      
      // This would actually call the OpenAI API in a real implementation
      // For demo purposes, we'll generate better mock questions based on the text
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate questions based on the text content and difficulty
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
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate questions based on the text content and difficulty
      return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
    } catch (error) {
      console.error('Error generating questions locally:', error);
      throw new Error('Failed to generate questions locally');
    }
  }
};

// Helper function to generate questions based on text content and difficulty
function generateQuestionsFromText(
  text: string, 
  numQuestions: number, 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Question[] {
  const questions: Question[] = [];
  
  // Extract some keywords from the text to make questions more relevant
  const words = text.split(/\s+/).filter(word => word.length > 5);
  const uniqueWords = [...new Set(words)];
  
  // Sample sentences from the text (simplified approach)
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 30);
  
  // Adjust complexity based on difficulty
  const complexityFactor = difficulty === 'easy' ? 1 : (difficulty === 'medium' ? 2 : 3);
  
  for (let i = 0; i < numQuestions; i++) {
    const id = `q${i + 1}`;
    
    // Create a question based on the text and difficulty
    let questionText = "";
    
    if (sentences.length > i) {
      // Use a sentence from the text as base for the question
      const sentence = sentences[i % sentences.length].trim();
      const words = sentence.split(/\s+/);
      
      if (words.length > 5) {
        if (difficulty === 'easy') {
          // Easy: Simple recall questions
          questionText = `Question ${i + 1}: Selon le texte, que signifie "${words[Math.floor(words.length / 2)]}" dans ce contexte?`;
        } else if (difficulty === 'medium') {
          // Medium: Understanding concepts
          const wordToReplace = words[Math.floor(words.length / 2)];
          questionText = `Question ${i + 1}: Dans la phrase "${sentence}", quel mot pourrait remplacer "${wordToReplace}" tout en conservant le sens du texte?`;
        } else {
          // Hard: Analysis and synthesis
          questionText = `Question ${i + 1}: Quelle conclusion peut-on tirer de la phrase suivante: "${sentence}"?`;
        }
      } else {
        questionText = `Question ${i + 1}: Quelle information peut-on trouver dans le texte concernant ${words[0] || "ce sujet"}?`;
      }
    } else {
      // Fallback if we don't have enough sentences
      const keyword = uniqueWords[i % uniqueWords.length] || "sujet";
      questionText = `Question ${i + 1}: Que dit le document à propos de "${keyword}"?`;
    }
    
    // Generate options based on available words from the text
    const options = [];
    const correctOptionIndex = Math.floor(Math.random() * 4); // Random correct answer
    
    // Make options more complex based on difficulty
    for (let j = 0; j < 4; j++) {
      const optionId = `${id}_${String.fromCharCode(97 + j)}`;
      const isCorrect = j === correctOptionIndex;
      
      let optionText = "";
      if (uniqueWords.length > (i * 4 + j)) {
        // Create more complex options based on difficulty
        if (difficulty === 'easy') {
          optionText = `${uniqueWords[i * 4 + j]}`;
        } else if (difficulty === 'medium') {
          optionText = `${uniqueWords[i * 4 + j]} ${uniqueWords[(i * 4 + j + 5) % uniqueWords.length] || ''}`;
        } else {
          // Hard: more complex options
          optionText = `${uniqueWords[i * 4 + j]} ${uniqueWords[(i * 4 + j + 5) % uniqueWords.length] || ''} ${uniqueWords[(i * 4 + j + 10) % uniqueWords.length] || ''}`;
        }
      } else {
        optionText = `Option ${String.fromCharCode(65 + j)} pour la question ${i + 1}`;
      }
      
      options.push({
        id: optionId,
        text: optionText,
        isCorrect
      });
    }
    
    // Create explanation based on the correct answer and difficulty
    const correctOption = options[correctOptionIndex];
    let explanation = `La réponse correcte est "${correctOption.text}"`;
    
    if (difficulty === 'easy') {
      explanation += ` car c'est l'élément mentionné dans le document.`;
    } else if (difficulty === 'medium') {
      explanation += ` car cela correspond au contexte du document et reflète l'information présentée.`;
    } else {
      explanation += ` car en analysant le contenu du document, on peut déduire cette conclusion logique qui s'aligne avec les concepts présentés.`;
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
