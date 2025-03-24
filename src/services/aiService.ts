
import { Question } from '@/types/quiz';

interface AIServiceOptions {
  text: string;
  numQuestions: number;
  additionalInfo?: string;
}

interface OpenAIOptions extends AIServiceOptions {
  apiKey: string;
}

export const AIService = {
  generateQuestionsWithOpenAI: async (options: OpenAIOptions): Promise<Question[]> => {
    const { text, numQuestions, additionalInfo, apiKey } = options;
    
    try {
      console.log(`Generating ${numQuestions} questions with OpenAI`);
      
      // This would actually call the OpenAI API in a real implementation
      // For demo purposes, we'll simulate the response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock questions
      return generateMockQuestions(numQuestions, text, additionalInfo);
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      throw new Error('Failed to generate questions with OpenAI');
    }
  },
  
  generateQuestionsLocally: async (options: AIServiceOptions): Promise<Question[]> => {
    const { text, numQuestions, additionalInfo } = options;
    
    try {
      console.log(`Generating ${numQuestions} questions locally`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock questions
      return generateMockQuestions(numQuestions, text, additionalInfo);
    } catch (error) {
      console.error('Error generating questions locally:', error);
      throw new Error('Failed to generate questions locally');
    }
  }
};

// Helper function to generate mock questions
function generateMockQuestions(numQuestions: number, text: string, additionalInfo?: string): Question[] {
  const questions: Question[] = [];
  
  for (let i = 0; i < numQuestions; i++) {
    const id = `q${i + 1}`;
    const options = [
      { id: `${id}_a`, text: `Option A for question ${i + 1}`, isCorrect: i % 4 === 0 },
      { id: `${id}_b`, text: `Option B for question ${i + 1}`, isCorrect: i % 4 === 1 },
      { id: `${id}_c`, text: `Option C for question ${i + 1}`, isCorrect: i % 4 === 2 },
      { id: `${id}_d`, text: `Option D for question ${i + 1}`, isCorrect: i % 4 === 3 },
    ];
    
    questions.push({
      id,
      text: `Question ${i + 1}: What is the answer to this question based on the document?`,
      options,
      explanation: `This is the explanation for question ${i + 1}. The correct answer is option ${String.fromCharCode(65 + (i % 4))}.`,
    });
  }
  
  return questions;
}
