
import { Question } from '@/types/quiz';

// Cette interface définit les paramètres requis pour la génération de questions
interface GenerateQuestionsParams {
  text: string;
  numQuestions: number;
  additionalInfo?: string;
  apiKey?: string;
}

// Service pour générer des quiz avec l'IA
export class AIService {
  // Méthode pour générer des questions via OpenAI API
  static async generateQuestionsWithOpenAI({
    text,
    numQuestions,
    additionalInfo,
    apiKey
  }: GenerateQuestionsParams): Promise<Question[]> {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    try {
      // Construction de la requête pour OpenAI
      const prompt = `
        Crée ${numQuestions} questions QCM basées sur le texte suivant:
        
        ${text}
        
        ${additionalInfo ? `Informations supplémentaires: ${additionalInfo}` : ''}
        
        Format souhaité: Questions avec 4 options de réponse, une seule étant correcte.
        Inclure une explication pour chaque réponse correcte.
      `;

      console.log("Calling OpenAI API with apiKey:", apiKey.substring(0, 10) + "...");
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // Using gpt-4o as specified
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en éducation qui crée des questions QCM de haute qualité basées sur des textes académiques.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        throw new Error(errorData.error?.message || 'Error calling OpenAI API');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      console.log("OpenAI response received successfully");
      
      // Transformation de la réponse en questions structurées
      return this.parseAIResponseToQuestions(aiResponse);
    } catch (error) {
      console.error("Error generating questions with OpenAI:", error);
      throw error;
    }
  }

  // Méthode pour générer des questions localement (sans API)
  static async generateQuestionsLocally({
    text,
    numQuestions,
    additionalInfo
  }: GenerateQuestionsParams): Promise<Question[]> {
    // Simuler un délai pour l'effet de génération
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Générer des questions d'exemple
    return Array.from({ length: numQuestions }).map((_, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1} basée sur les principes du document fourni`,
      options: [
        { id: 'a', text: 'Option A', isCorrect: i % 4 === 0 },
        { id: 'b', text: 'Option B', isCorrect: i % 4 === 1 },
        { id: 'c', text: 'Option C', isCorrect: i % 4 === 2 },
        { id: 'd', text: 'Option D', isCorrect: i % 4 === 3 },
      ],
      explanation: 'Explication générée pour cette question (simulation locale).',
    }));
  }

  // Méthode pour analyser la réponse de l'IA et la transformer en questions structurées
  private static parseAIResponseToQuestions(aiResponse: string): Question[] {
    const questions: Question[] = [];
    
    // Logique simplifiée pour parser le texte
    // Dans une implémentation réelle, cela serait plus robuste
    const questionBlocks = aiResponse.split(/Question \d+:/g).filter(block => block.trim());
    
    questionBlocks.forEach((block, index) => {
      const lines = block.split('\n').filter(line => line.trim());
      const questionText = lines[0].trim();
      
      const options = [];
      let explanation = '';
      let correctOptionId = '';
      
      // Chercher les options (A, B, C, D)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('A.') || line.startsWith('A)')) {
          options.push({ id: 'a', text: line.substring(2).trim(), isCorrect: false });
        } else if (line.startsWith('B.') || line.startsWith('B)')) {
          options.push({ id: 'b', text: line.substring(2).trim(), isCorrect: false });
        } else if (line.startsWith('C.') || line.startsWith('C)')) {
          options.push({ id: 'c', text: line.substring(2).trim(), isCorrect: false });
        } else if (line.startsWith('D.') || line.startsWith('D)')) {
          options.push({ id: 'd', text: line.substring(2).trim(), isCorrect: false });
        } else if (line.includes('Réponse correcte') || line.includes('Bonne réponse')) {
          // Identifier l'option correcte
          const correctOption = line.match(/[ABCD]/);
          if (correctOption) {
            correctOptionId = correctOption[0].toLowerCase();
          }
          
          // L'explication commence généralement après "Explication:"
          const explanationStart = i + 1;
          if (explanationStart < lines.length) {
            explanation = lines.slice(explanationStart).join(' ').trim();
          }
          
          break;
        }
      }
      
      // Marquer l'option correcte
      if (correctOptionId && options.length === 4) {
        options.forEach(option => {
          if (option.id === correctOptionId) {
            option.isCorrect = true;
          }
        });
      } else if (options.length === 4) {
        // Si aucune option correcte n'est identifiée, en définir une par défaut
        options[0].isCorrect = true;
      }
      
      questions.push({
        id: `q${index + 1}`,
        text: questionText,
        options,
        explanation: explanation || 'Aucune explication fournie.'
      });
    });
    
    return questions;
  }
}
