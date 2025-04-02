
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || "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";
const APP_URL = Deno.env.get('APP_URL') || "https://quiznest.app";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, numQuestions, difficulty, additionalInfo } = await req.json();
    
    console.log(`Generating ${numQuestions} questions with Qwen. Difficulty: ${difficulty}`);
    
    // Construct the prompt for Qwen
    const prompt = `
      Génère ${numQuestions} questions de quiz QCM basées sur le texte fourni.
      Niveau de difficulté: ${difficulty}
      
      Texte: """${text.slice(0, 15000)}"""
      
      ${additionalInfo ? `Informations supplémentaires: ${additionalInfo}` : ''}
      
      INSTRUCTIONS IMPORTANTES:
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
      Tu dois fournir un tableau JSON valide contenant les questions exactement comme ceci:
      
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
      
      Tu dois générer EXACTEMENT ${numQuestions} questions.
    `;

    console.log("Sending request to OpenRouter.ai with Qwen model");
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "QuizNest",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "qwen/qwen2.5-7b-instruct",
        "messages": [
          {
            "role": "system",
            "content": "Tu es un expert en création de quiz éducatifs. Tu génères des questions QCM de haute qualité basées sur le contenu fourni."
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        "temperature": 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error response from OpenRouter API:', errorData);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenRouter response received');
    
    // Extract the text from OpenRouter's response
    let generatedText = '';
    if (data.choices && data.choices.length > 0 && 
        data.choices[0].message && data.choices[0].message.content) {
      generatedText = data.choices[0].message.content;
    } else {
      throw new Error('Unexpected response format from OpenRouter API');
    }

    // Extract JSON from the text
    let questions = [];
    try {
      // Try to find JSON array in the response
      const jsonMatch = generatedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenRouter response:', parseError);
      throw new Error('Failed to parse questions from OpenRouter response');
    }

    // Verify and validate questions format
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format or empty questions array');
    }

    // Ensure each question has the required format
    const validatedQuestions = questions.map((q, index) => {
      const questionId = q.id || `q${index + 1}`;
      
      // Ensure options are valid
      const options = Array.isArray(q.options) ? q.options.map((o, optIndex) => ({
        id: o.id || `${questionId}_${String.fromCharCode(97 + optIndex)}`,
        text: o.text || `Option ${String.fromCharCode(65 + optIndex)}`,
        isCorrect: Boolean(o.isCorrect)
      })) : [];

      // Make sure there's exactly one correct option
      const correctOptions = options.filter(o => o.isCorrect);
      if (correctOptions.length !== 1 && options.length > 0) {
        options[0].isCorrect = true;
        for (let i = 1; i < options.length; i++) {
          options[i].isCorrect = false;
        }
      }

      return {
        id: questionId,
        text: q.text || `Question ${index + 1}?`,
        options: options.length > 0 ? options : [
          { id: `${questionId}_a`, text: "Option A", isCorrect: true },
          { id: `${questionId}_b`, text: "Option B", isCorrect: false },
          { id: `${questionId}_c`, text: "Option C", isCorrect: false },
          { id: `${questionId}_d`, text: "Option D", isCorrect: false }
        ],
        explanation: q.explanation || "Aucune explication fournie",
        difficulty: q.difficulty || difficulty
      };
    });

    console.log(`Successfully generated ${validatedQuestions.length} questions`);

    return new Response(JSON.stringify({ questions: validatedQuestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-with-qwen function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unknown error occurred',
      errorDetail: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
