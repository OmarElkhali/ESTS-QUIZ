
import { Question } from '@/types/quiz';
import OpenAI from 'openai';

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
      
      if (!apiKey) {
        console.log('No API key provided, falling back to local generation');
        return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
      }
      
      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey });
      
      // Construire le prompt pour l'API
      const prompt = `
      Génère ${numQuestions} questions de quiz de type QCM de niveau ${difficulty} basées sur le texte suivant. 
      Les questions doivent être diverses et couvrir différents aspects du texte.
      
      Texte: "${text.substring(0, 2000)}..."
      
      ${additionalInfo ? `Informations supplémentaires: ${additionalInfo}` : ''}
      
      Pour chaque question, fournir:
      - Un identifiant unique
      - Le texte de la question
      - 4 options de réponses dont une seule correcte
      - Une explication de la réponse correcte
      - Le niveau de difficulté: ${difficulty}
      
      Format de réponse JSON:
      [
        {
          "id": "q1",
          "text": "Texte de la question?",
          "options": [
            {"id": "q1_a", "text": "Option A", "isCorrect": false},
            {"id": "q1_b", "text": "Option B", "isCorrect": true},
            {"id": "q1_c", "text": "Option C", "isCorrect": false},
            {"id": "q1_d", "text": "Option D", "isCorrect": false}
          ],
          "explanation": "Explication pourquoi B est correcte",
          "difficulty": "${difficulty}"
        },
        ...
      ]
      `;
      
      try {
        console.log('Calling OpenAI API...');
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "Tu es un expert en création de quiz éducatifs. Génère des questions de quiz QCM de haute qualité basées sur le contenu fourni. Réponds uniquement au format JSON demandé." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });
        
        // Récupérer le contenu de la réponse
        const content = response.choices[0].message.content;
        console.log("OpenAI response received:", content ? content.substring(0, 100) + "..." : "Empty response");
        
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }
        
        try {
          // Parser la réponse JSON
          const parsedResponse = JSON.parse(content);
          
          if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
            console.log(`Successfully parsed ${parsedResponse.questions.length} questions from OpenAI`);
            return parsedResponse.questions;
          } else if (Array.isArray(parsedResponse)) {
            console.log(`Successfully parsed ${parsedResponse.length} questions from array response`);
            return parsedResponse;
          } else {
            console.error("Unexpected response format:", parsedResponse);
            throw new Error("Unexpected response format from OpenAI");
          }
        } catch (parseError) {
          console.error("Error parsing OpenAI response:", parseError);
          console.log("Raw response:", content);
          // Fallback to local generation
          return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
        }
      } catch (apiError) {
        console.error("OpenAI API error:", apiError);
        // Fallback to local generation
        return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
      }
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      // Always return something to prevent complete failure
      return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
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
      // Ensure we never throw an error that would cause the quiz creation to fail
      return generateFallbackQuestions(numQuestions, difficulty);
    }
  }
};

// Generate fallback questions when everything else fails
function generateFallbackQuestions(numQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): Question[] {
  console.log(`Generating ${numQuestions} fallback questions due to error`);
  const questions: Question[] = [];
  
  for (let i = 0; i < numQuestions; i++) {
    const id = `q${i + 1}`;
    questions.push({
      id,
      text: `Question ${i + 1} sur le contenu du document?`,
      options: [
        { id: `${id}_a`, text: "Première option", isCorrect: i % 4 === 0 },
        { id: `${id}_b`, text: "Deuxième option", isCorrect: i % 4 === 1 },
        { id: `${id}_c`, text: "Troisième option", isCorrect: i % 4 === 2 },
        { id: `${id}_d`, text: "Quatrième option", isCorrect: i % 4 === 3 }
      ],
      explanation: `Explication de la réponse correcte à la question ${i + 1}.`,
      difficulty
    });
  }
  
  return questions;
}

// Improved function to generate questions based on text content
function generateQuestionsFromText(
  text: string, 
  numQuestions: number, 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Question[] {
  console.log(`Starting question generation from text (${text.length} chars)`);
  const questions: Question[] = [];
  
  try {
    // Extract meaningful content from the text
    const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const words = text.split(/\s+/).filter(word => word.length > 5);
    const uniqueWords = [...new Set(words)];
    
    console.log(`Extracted ${paragraphs.length} paragraphs, ${sentences.length} sentences, ${uniqueWords.length} unique words`);
    
    // Build a simple summary of the text for context
    const textSummary = paragraphs.length > 0 
      ? paragraphs.slice(0, 3).join(' ') 
      : text.substring(0, 500);
    
    // Extract key concepts from the text
    const keywords = uniqueWords
      .filter(word => word.length > 6)
      .slice(0, 20);
    
    console.log(`Using ${keywords.length} keywords for question generation`);
    
    // More advanced question types by difficulty level
    const questionsByDifficulty = {
      easy: [
        "Quelle est la définition de %s selon le texte?",
        "Quel concept est directement associé à %s dans le document?",
        "Que signifie %s dans le contexte du document?",
        "Quelle information est correcte concernant %s?",
        "Quel est l'élément principal décrit dans %s?"
      ],
      medium: [
        "Comment le concept de %s est-il relié à %s dans le texte?",
        "Quelle analyse peut-on faire de %s selon le passage suivant?",
        "Quelle est la relation entre %s et %s décrite dans le document?",
        "Comment pourrait-on interpréter %s dans le contexte de %s?",
        "Selon le texte, quelle est la conséquence de %s sur %s?"
      ],
      hard: [
        "Quelle synthèse critique peut-on faire de la relation entre %s et %s?",
        "En analysant le passage sur %s, quelle conclusion peut-on tirer concernant %s?",
        "Quelles seraient les implications théoriques de %s dans le contexte de %s?",
        "Comment pourrait-on évaluer l'argument concernant %s présenté dans le texte?",
        "Quelle hypothèse pourrait expliquer la relation entre %s et %s mentionnée dans le document?"
      ]
    };
    
    for (let i = 0; i < numQuestions; i++) {
      const id = `q${i + 1}`;
      let questionText = "";
      
      try {
        // Select random concepts from the text to build the question
        const randomConcept1 = keywords[Math.floor(Math.random() * keywords.length)] || "ce concept";
        const randomConcept2 = keywords[Math.floor(Math.random() * keywords.length)] || "cet élément";
        
        // Select a question template based on difficulty
        const questionTemplates = questionsByDifficulty[difficulty];
        let questionTemplate = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
        
        // Replace placeholders with actual concepts
        questionText = questionTemplate.replace('%s', randomConcept1).replace('%s', randomConcept2);
        
        // For difficult questions, add a richer context
        if (difficulty === 'hard') {
          const contextParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)] || sentences[Math.floor(Math.random() * sentences.length)];
          if (contextParagraph) {
            questionText = `Dans le contexte suivant: "${contextParagraph.substring(0, 100)}...", ${questionText}`;
          }
        }
        
        // Generate options with a correct answer
        const options = [];
        const correctOptionIndex = Math.floor(Math.random() * 4);
        
        // Extract relevant information from the text for the options
        for (let j = 0; j < 4; j++) {
          const optionId = `${id}_${String.fromCharCode(97 + j)}`;
          const isCorrect = j === correctOptionIndex;
          
          // Find a relevant paragraph or sentence for this option
          const optionSourceIndex = (i + j) % Math.max(sentences.length, 1);
          const optionSource = sentences[optionSourceIndex] || paragraphs[optionSourceIndex % paragraphs.length] || textSummary;
          
          let optionText = "";
          
          if (isCorrect) {
            // Correct option - extract exact and relevant information
            const sentenceWords = optionSource.split(/\s+/);
            const startIndex = Math.floor(Math.random() * Math.max(sentenceWords.length - 8, 1));
            const length = difficulty === 'easy' ? 5 : (difficulty === 'medium' ? 7 : 10);
            
            optionText = sentenceWords.slice(startIndex, startIndex + length).join(' ');
            optionText = optionText.charAt(0).toUpperCase() + optionText.slice(1);
            
            if (!optionText.endsWith('.') && !optionText.endsWith('!') && !optionText.endsWith('?')) {
              optionText += '.';
            }
          } else {
            // Incorrect options - plausible but inaccurate variations
            const sentenceWords = optionSource.split(/\s+/);
            const startIndex = Math.floor(Math.random() * Math.max(sentenceWords.length - 6, 1));
            
            // Modify the content slightly for incorrect options
            let incorrectText = sentenceWords.slice(startIndex, startIndex + 5).join(' ');
            incorrectText = incorrectText.charAt(0).toUpperCase() + incorrectText.slice(1);
            
            if (!incorrectText.endsWith('.') && !incorrectText.endsWith('!') && !incorrectText.endsWith('?')) {
              incorrectText += '.';
            }
            
            // Add modifiers based on difficulty
            if (difficulty === 'easy') {
              // Clearly incorrect options for easy questions
              optionText = incorrectText;
            } else if (difficulty === 'medium') {
              // Partially true but with errors for medium level
              const modifiers = [
                "mais pas dans ce contexte",
                "bien que ce ne soit pas exact",
                "ce qui est une interprétation inexacte",
                "contrairement à ce qui est mentionné"
              ];
              const modifier = modifiers[j % modifiers.length];
              optionText = `${incorrectText} ${modifier}`;
            } else {
              // Very misleading options for difficult level
              const oppositeConcept = keywords[(i + j + 10) % keywords.length] || "un autre concept";
              optionText = `${incorrectText} en relation avec ${oppositeConcept}`;
            }
          }
          
          // Ensure the option has minimal content
          if (optionText.split(/\s+/).length < 3) {
            optionText = isCorrect 
              ? `Information exacte sur ${randomConcept1}.` 
              : `Interprétation erronée concernant ${randomConcept1}.`;
          }
          
          options.push({
            id: optionId,
            text: optionText,
            isCorrect
          });
        }
        
        // Create a detailed explanation based on the content
        const correctOption = options[correctOptionIndex];
        let explanation = `La réponse correcte est "${correctOption.text}"`;
        
        // Enrich the explanation based on difficulty
        if (difficulty === 'easy') {
          explanation += `. Cette information apparaît directement dans le document, où ${randomConcept1} est défini et expliqué.`;
        } else if (difficulty === 'medium') {
          explanation += `. En analysant le contenu du document, on peut établir cette relation entre ${randomConcept1} et ${randomConcept2}, car le texte développe les impacts et influences mutuelles.`;
        } else {
          explanation += `. Cette conclusion peut être déduite en synthétisant plusieurs passages du document qui abordent ${randomConcept1} et ${randomConcept2}, notamment dans le contexte théorique présenté.`;
        }
        
        // Add a reference to the source text in the explanation
        const sourceReference = sentences[i % sentences.length] || paragraphs[i % paragraphs.length];
        if (sourceReference) {
          explanation += ` On peut notamment se référer au passage: "${sourceReference.substring(0, 70)}..."`;
        }
        
        questions.push({
          id,
          text: questionText,
          options,
          explanation,
          difficulty
        });
      } catch (questionError) {
        console.error(`Error generating question ${i + 1}:`, questionError);
        // Add a fallback question if there's an error
        questions.push({
          id,
          text: `Question ${i + 1} sur le document?`,
          options: [
            { id: `${id}_a`, text: "Première option", isCorrect: i % 4 === 0 },
            { id: `${id}_b`, text: "Deuxième option", isCorrect: i % 4 === 1 },
            { id: `${id}_c`, text: "Troisième option", isCorrect: i % 4 === 2 },
            { id: `${id}_d`, text: "Quatrième option", isCorrect: i % 4 === 3 }
          ],
          explanation: `Explication de la réponse correcte à la question ${i + 1}.`,
          difficulty
        });
      }
    }
    
    console.log(`Successfully generated ${questions.length} questions`);
    return questions;
    
  } catch (error) {
    console.error('Error in generateQuestionsFromText:', error);
    // Return basic fallback questions if the main logic fails
    return generateFallbackQuestions(numQuestions, difficulty);
  }
}
