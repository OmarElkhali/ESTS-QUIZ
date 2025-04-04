
import { Question } from '@/types/quiz';
import { supabase } from "@/integrations/supabase/client";

// OpenRouter API key pour Qwen
const OPENROUTER_API_KEY = "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";

export async function generateQuestionsWithQwen(
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Promise<Question[]> {
  try {
    console.log(`Génération de ${numQuestions} questions avec Qwen via OpenRouter...`);
    
    // Construire le prompt pour la génération de questions
    const prompt = `
    Génère ${numQuestions} questions de quiz QCM en français basées sur le texte fourni.
    Niveau de difficulté: ${difficulty}
    
    Texte: """${text.slice(0, 3000)}"""
    
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
    `;
    
    try {
      // Appel direct à l'API OpenRouter pour Qwen
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://quizai.app", 
          "X-Title": "QuizAI Application",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "qwen/qwen-2-5-32b",
          "messages": [
            {
              "role": "system", 
              "content": "Tu es un expert en création de quiz éducatifs. Ta tâche est de générer des questions QCM de haute qualité basées uniquement sur le contenu fourni."
            },
            { 
              "role": "user", 
              "content": prompt 
            }
          ],
          "response_format": { "type": "json_object" }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur OpenRouter:", errorText);
        throw new Error(`Erreur OpenRouter: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Réponse OpenRouter reçue:", data);
      
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Réponse vide depuis OpenRouter");
      }
      
      // Traiter la réponse JSON
      let questions = [];
      try {
        const parsedContent = JSON.parse(content);
        
        if (Array.isArray(parsedContent)) {
          questions = parsedContent;
        } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
          questions = parsedContent.questions;
        } else {
          // Tenter de trouver un tableau
          const possibleArrays = Object.values(parsedContent).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            questions = possibleArrays[0];
          } else {
            throw new Error("Format de réponse incompatible");
          }
        }
        
        // Validation et formatage des questions
        const validatedQuestions = questions.map((q: any, index: number) => {
          const questionId = q.id || `q${index + 1}`;
          const validOptions = Array.isArray(q.options) && q.options.length >= 2;
          
          const options = validOptions 
            ? q.options.map((o: any, optIndex: number) => ({
                id: o.id || `${questionId}_${String.fromCharCode(97 + optIndex)}`,
                text: o.text || `Option ${String.fromCharCode(65 + optIndex)}`,
                isCorrect: Boolean(o.isCorrect)
              }))
            : [
                { id: `${questionId}_a`, text: "Option A", isCorrect: true },
                { id: `${questionId}_b`, text: "Option B", isCorrect: false },
                { id: `${questionId}_c`, text: "Option C", isCorrect: false },
                { id: `${questionId}_d`, text: "Option D", isCorrect: false }
              ];
          
          // Vérifier qu'il y a exactement une réponse correcte
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
            options: options,
            explanation: q.explanation || "Aucune explication fournie",
            difficulty: q.difficulty || difficulty
          };
        });
        
        console.log(`${validatedQuestions.length} questions générées avec succès par Qwen`);
        return validatedQuestions;
      } catch (parseError) {
        console.error("Erreur d'analyse de la réponse OpenRouter:", parseError);
        throw parseError;
      }
    } catch (apiError) {
      console.error("Erreur API OpenRouter:", apiError);
      
      // Utiliser la fonction Supabase comme fallback
      console.log("Tentative avec la fonction Supabase generate-with-qwen...");
      return await generateQuestionsWithQwenViaSupabase(text, numQuestions, difficulty, additionalInfo);
    }
  } catch (error) {
    console.error('Erreur globale de génération avec Qwen:', error);
    
    // Fallback final: générer des questions localement
    console.log("Échec de toutes les méthodes d'IA, génération locale...");
    return generateQuestionsLocally(text, numQuestions, difficulty);
  }
}

// Fonction qui utilise la fonction Supabase comme fallback
async function generateQuestionsWithQwenViaSupabase(
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Promise<Question[]> {
  const { data, error } = await supabase.functions.invoke('generate-with-qwen', {
    body: { text, numQuestions, difficulty, additionalInfo }
  });
  
  if (error) {
    console.error('Erreur avec la fonction generate-with-qwen:', error);
    throw error;
  }
  
  if (!data || !data.questions || !Array.isArray(data.questions)) {
    console.error('Format de réponse invalide depuis la fonction Qwen:', data);
    throw new Error('Format de réponse invalide depuis la fonction Qwen');
  }
  
  console.log(`${data.questions.length} questions générées avec succès par Qwen via Supabase`);
  return data.questions;
}

// Fonction de génération locale comme dernier recours
function generateQuestionsLocally(
  text: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Question[] {
  console.log(`Génération locale de ${numQuestions} questions de niveau ${difficulty}`);
  
  const questions: Question[] = [];
  const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
  
  for (let i = 0; i < numQuestions; i++) {
    const id = `q${i + 1}`;
    
    // Construire une question basée sur le texte
    const paragraphIndex = i % paragraphs.length;
    const paragraph = paragraphs[paragraphIndex] || "Contenu du document";
    const words = paragraph.split(' ').filter(w => w.length > 4);
    const keyword = words[Math.floor(Math.random() * words.length)] || "concept";
    
    questions.push({
      id,
      text: `Que pouvez-vous dire à propos de "${keyword}" dans le document?`,
      options: [
        { id: `${id}_a`, text: `${keyword} est un concept clé mentionné dans le document.`, isCorrect: true },
        { id: `${id}_b`, text: `${keyword} n'est pas du tout abordé dans le document.`, isCorrect: false },
        { id: `${id}_c`, text: `${keyword} est mentionné mais n'est pas important.`, isCorrect: false },
        { id: `${id}_d`, text: `${keyword} est un terme inventé qui n'existe pas.`, isCorrect: false }
      ],
      explanation: `Le terme "${keyword}" apparaît dans le document et constitue un élément important du contenu.`,
      difficulty
    });
  }
  
  return questions;
}
