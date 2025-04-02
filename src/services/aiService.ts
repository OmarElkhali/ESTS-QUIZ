
import { Question } from '@/types/quiz';
import OpenAI from 'openai';
import { supabase } from "@/integrations/supabase/client";

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
      console.log(`Generating ${numQuestions} ${difficulty} questions with OpenAI from text of length ${text.length}`);
      
      if (!apiKey) {
        console.error('Aucune clé API fournie pour OpenAI');
        return generateQuestionsWithGemini(text, numQuestions, difficulty, additionalInfo);
      }
      
      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey });
      
      // Construire un prompt optimisé pour l'extraction de questions QCM
      const prompt = `
      Génère ${numQuestions} questions de quiz QCM basées sur le texte fourni.
      Niveau de difficulté: ${difficulty}
      
      Texte: """${text.slice(0, 3000)}"""
      
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
      Tu dois fournir uniquement un tableau JSON valide contenant les questions, sans aucun texte supplémentaire:
      
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
        },
        // autres questions...
      ]
      `;
      
      try {
        console.log('Appel de l\'API OpenAI...');
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Utilisation d'un modèle plus récent et plus performant
          messages: [
            { 
              role: "system", 
              content: "Tu es un expert en création de quiz éducatifs. Ta tâche est de générer des questions QCM de haute qualité basées uniquement sur le contenu fourni. Respecte STRICTEMENT le format demandé." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.5, // Plus déterministe pour des questions plus précises
          response_format: { type: "json_object" }, // Force le format JSON
        });
        
        // Récupérer le contenu de la réponse
        const content = response.choices[0].message.content;
        console.log("Réponse OpenAI reçue, taille:", content ? content.length : 0);
        
        if (!content) {
          console.error("Réponse vide de OpenAI");
          throw new Error("Réponse vide de l'API");
        }
        
        try {
          // Parser la réponse JSON
          const parsedContent = JSON.parse(content);
          let questions = [];
          
          // Gérer les différents formats possibles retournés par l'API
          if (Array.isArray(parsedContent)) {
            questions = parsedContent;
            console.log(`Succès: ${questions.length} questions extraites du tableau JSON`);
          } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
            questions = parsedContent.questions;
            console.log(`Succès: ${questions.length} questions extraites de l'objet JSON`);
          } else {
            console.error("Format de réponse inattendu:", JSON.stringify(parsedContent).substring(0, 200));
            
            // Recherche de tout tableau qui pourrait contenir des questions
            const possibleArrays = Object.values(parsedContent).filter(val => Array.isArray(val));
            if (possibleArrays.length > 0) {
              questions = possibleArrays[0];
              console.log(`Récupération de secours: ${questions.length} questions trouvées dans un champ alternatif`);
            } else {
              throw new Error("Format de réponse incompatible");
            }
          }
          
          // Validation des données reçues
          const validatedQuestions = questions.map((q: any, index: number) => {
            // S'assurer que chaque question a un ID unique
            const questionId = q.id || `q${index + 1}`;
            
            // Vérifier si les options sont valides
            const validOptions = Array.isArray(q.options) && q.options.length >= 2;
            
            // S'assurer qu'il y a exactement une réponse correcte
            const correctOptions = validOptions ? q.options.filter((o: any) => o.isCorrect === true) : [];
            if (correctOptions.length !== 1) {
              // Corriger les options si nécessaire
              if (validOptions) {
                // Marquer la première option comme correcte si aucune n'est correcte
                q.options[0].isCorrect = true;
                // Assurer que les autres sont incorrectes
                for (let i = 1; i < q.options.length; i++) {
                  q.options[i].isCorrect = false;
                }
              }
            }
            
            // Générer des IDs pour les options si nécessaire
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
            
            return {
              id: questionId,
              text: q.text || `Question ${index + 1}?`,
              options: options,
              explanation: q.explanation || "Aucune explication fournie",
              difficulty: q.difficulty || difficulty
            };
          });
          
          console.log(`${validatedQuestions.length} questions validées et prêtes à l'emploi`);
          return validatedQuestions;
          
        } catch (parseError) {
          console.error("Erreur d'analyse de la réponse OpenAI:", parseError);
          console.log("Réponse brute (100 premiers caractères):", content.substring(0, 100));
          
          // Try using Gemini as fallback
          return generateQuestionsWithGemini(text, numQuestions, difficulty, additionalInfo);
        }
      } catch (apiError) {
        console.error("Erreur d'API OpenAI:", apiError.message || apiError);
        return generateQuestionsWithGemini(text, numQuestions, difficulty, additionalInfo);
      }
    } catch (error) {
      console.error('Erreur globale de génération avec OpenAI:', error);
      return generateQuestionsWithGemini(text, numQuestions, difficulty, additionalInfo);
    }
  },
  
  generateQuestionsWithQwen: async (options: AIServiceOptions): Promise<Question[]> => {
    const { text, numQuestions, additionalInfo, difficulty = 'medium' } = options;
    
    try {
      console.log(`Génération de ${numQuestions} questions avec Qwen...`);
      
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
      
      console.log(`${data.questions.length} questions générées avec succès par Qwen`);
      return data.questions;
    } catch (error) {
      console.error('Erreur avec la génération Qwen:', error);
      // Fallback to Gemini
      return generateQuestionsWithGemini(text, numQuestions, difficulty, additionalInfo);
    }
  },
  
  generateQuestionsLocally: async (options: AIServiceOptions): Promise<Question[]> => {
    const { text, numQuestions, additionalInfo, difficulty = 'medium' } = options;
    
    try {
      console.log(`Essai de génération avec Qwen d'abord...`);
      try {
        const qwenQuestions = await AIService.generateQuestionsWithQwen(options);
        if (qwenQuestions && qwenQuestions.length > 0) {
          return qwenQuestions;
        }
      } catch (qwenError) {
        console.log('Échec de Qwen, passage à Gemini:', qwenError);
      }
      
      console.log(`Essai de génération avec Gemini...`);
      const geminiQuestions = await generateQuestionsWithGemini(text, numQuestions, difficulty, additionalInfo);
      
      if (geminiQuestions && geminiQuestions.length > 0) {
        return geminiQuestions;
      }
      
      console.log(`Fallback à la génération locale de ${numQuestions} questions ${difficulty}`);
      return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
    } catch (error) {
      console.error('Erreur génération avec tous les modèles:', error);
      return generateFallbackQuestions(numQuestions, difficulty);
    }
  }
};

// Use Gemini via Supabase function
async function generateQuestionsWithGemini(
  text: string, 
  numQuestions: number, 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Promise<Question[]> {
  try {
    console.log(`Generating ${numQuestions} questions with Gemini API`);
    
    const { data, error } = await supabase.functions.invoke('generate-questions', {
      body: { text, numQuestions, difficulty, additionalInfo }
    });

    if (error) {
      console.error('Error calling Gemini function:', error);
      throw error;
    }

    if (!data || !data.questions || !Array.isArray(data.questions)) {
      console.error('Invalid response from Gemini function:', data);
      throw new Error('Invalid response format from Gemini function');
    }

    console.log(`Successfully received ${data.questions.length} questions from Gemini`);
    return data.questions;
  } catch (error) {
    console.error('Error with Gemini question generation:', error);
    // Fallback to local generation
    return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
  }
}

// Generate fallback questions when everything else fails
function generateFallbackQuestions(numQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): Question[] {
  console.log(`Génération de ${numQuestions} questions de secours suite à une erreur`);
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

// Version améliorée de la génération de questions basée sur le texte
function generateQuestionsFromText(
  text: string, 
  numQuestions: number, 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  additionalInfo?: string
): Question[] {
  console.log(`Début de la génération de questions à partir du texte (${text.length} caractères)`);
  const questions: Question[] = [];
  
  try {
    // Extraction de contenu significatif du texte
    const paragraphs = text.split('\n').filter(p => p.trim().length > 20);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Extraction plus intelligente des termes clés
    const words = text.toLowerCase().split(/\s+/).filter(word => 
      word.length > 5 && 
      !['alors', 'ainsi', 'comme', 'cependant', 'parce', 'pourtant'].includes(word)
    );
    
    // Éliminer les mots les plus courants avant d'extraire les mots uniques
    const commonWords = new Set(['après', 'avant', 'cette', 'autre', 'entre', 'partir', 'depuis', 'plusieurs', 'pendant']);
    const filteredWords = words.filter(word => !commonWords.has(word));
    
    // Obtenir les mots uniques les plus fréquents
    const wordFrequency: Record<string, number> = {};
    filteredWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    // Trier les mots par fréquence et prendre les top N
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    const keyTerms = sortedWords.slice(0, 30);
    
    console.log(`Extraction de ${paragraphs.length} paragraphes, ${sentences.length} phrases, ${keyTerms.length} termes clés`);
    
    // Construction d'un résumé simple du texte pour le contexte
    const textSummary = paragraphs.length > 0 
      ? paragraphs.slice(0, 3).join(' ') 
      : text.substring(0, 500);
    
    // Types de questions plus avancés par niveau de difficulté
    const questionsByDifficulty = {
      easy: [
        "Quelle est la définition de %s selon le texte?",
        "Quel concept est directement associé à %s dans le document?",
        "Que signifie %s dans le contexte du document?",
        "Quelle information est correcte concernant %s?",
        "Quel est l'élément principal décrit dans le passage sur %s?"
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
      // Garantir que nous avons suffisamment de contenu pour générer une question
      if (sentences.length === 0 && paragraphs.length === 0) {
        console.warn("Contenu insuffisant pour générer plus de questions");
        break;
      }
      
      const id = `q${i + 1}`;
      let questionText = "";
      
      try {
        // Sélectionner des phrases ou paragraphes aléatoires pour cette question
        const randomSentenceIndex = Math.floor(Math.random() * Math.max(sentences.length, 1));
        const randomParagraphIndex = Math.floor(Math.random() * Math.max(paragraphs.length, 1));
        
        const sentenceSource = sentences.length > 0 ? sentences[randomSentenceIndex] : "";
        const paragraphSource = paragraphs.length > 0 ? paragraphs[randomParagraphIndex] : "";
        
        // Choisir la source avec le plus de contenu
        const contentSource = sentenceSource.length > paragraphSource.length ? sentenceSource : paragraphSource;
        
        // Extraire des termes significatifs du contenu source
        const contentWords = contentSource.toLowerCase().split(/\s+/).filter(word => word.length > 5);
        const sourceTerms = [...new Set(contentWords)];
        
        // Sélectionner des concepts aléatoires pour construire la question
        const getRandomTerm = () => {
          // Préférer les termes de la source actuelle, sinon utiliser les termes globaux
          const termsPool = sourceTerms.length > 2 ? sourceTerms : keyTerms;
          const term = termsPool[Math.floor(Math.random() * termsPool.length)];
          // Capitaliser le terme
          return term ? term.charAt(0).toUpperCase() + term.slice(1) : "ce concept";
        };
        
        const randomConcept1 = getRandomTerm();
        const randomConcept2 = getRandomTerm();
        
        // Sélectionner un modèle de question basé sur la difficulté
        const questionTemplates = questionsByDifficulty[difficulty];
        let questionTemplate = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
        
        // Remplacer les espaces réservés par des concepts réels
        questionText = questionTemplate.replace('%s', randomConcept1).replace('%s', randomConcept2);
        
        // Pour les questions difficiles, ajouter un contexte plus riche
        if (difficulty === 'hard' && contentSource) {
          questionText = `Dans le contexte suivant: "${contentSource.substring(0, 100)}...", ${questionText}`;
        }
        
        // Générer des options avec une réponse correcte
        const options = [];
        const correctOptionIndex = Math.floor(Math.random() * 4);
        
        // Extraire des informations pertinentes du texte pour les options
        for (let j = 0; j < 4; j++) {
          const optionId = `${id}_${String.fromCharCode(97 + j)}`;
          const isCorrect = j === correctOptionIndex;
          
          // Trouver un paragraphe ou une phrase pertinente pour cette option
          const optionSourceIndex = (i + j) % Math.max(sentences.length, 1);
          const optionSource = sentences[optionSourceIndex] || paragraphs[optionSourceIndex % paragraphs.length] || textSummary;
          
          let optionText = "";
          
          if (isCorrect) {
            // Option correcte - extraire des informations exactes et pertinentes
            if (contentSource) {
              const sentenceWords = contentSource.split(/\s+/);
              const startIndex = Math.floor(Math.random() * Math.max(sentenceWords.length - 8, 1));
              const length = difficulty === 'easy' ? 5 : (difficulty === 'medium' ? 7 : 10);
              
              optionText = sentenceWords.slice(startIndex, startIndex + length).join(' ');
              optionText = optionText.charAt(0).toUpperCase() + optionText.slice(1);
              
              if (!optionText.endsWith('.') && !optionText.endsWith('!') && !optionText.endsWith('?')) {
                optionText += '.';
              }
            } else {
              optionText = `Information correcte concernant ${randomConcept1}.`;
            }
          } else {
            // Options incorrectes - variations plausibles mais inexactes
            if (optionSource) {
              const sentenceWords = optionSource.split(/\s+/);
              const startIndex = Math.floor(Math.random() * Math.max(sentenceWords.length - 6, 1));
              
              // Modifier légèrement le contenu pour les options incorrectes
              let incorrectText = sentenceWords.slice(startIndex, startIndex + 5).join(' ');
              incorrectText = incorrectText.charAt(0).toUpperCase() + incorrectText.slice(1);
              
              if (!incorrectText.endsWith('.') && !incorrectText.endsWith('!') && !incorrectText.endsWith('?')) {
                incorrectText += '.';
              }
              
              // Ajouter des modificateurs en fonction de la difficulté
              if (difficulty === 'easy') {
                // Options clairement incorrectes pour les questions faciles
                optionText = incorrectText;
              } else if (difficulty === 'medium') {
                // Partiellement vrai mais avec des erreurs pour le niveau moyen
                const modifiers = [
                  "mais pas dans ce contexte",
                  "bien que ce ne soit pas exact",
                  "ce qui est une interprétation inexacte",
                  "contrairement à ce qui est mentionné"
                ];
                const modifier = modifiers[j % modifiers.length];
                optionText = `${incorrectText} ${modifier}`;
              } else {
                // Options très trompeuses pour le niveau difficile
                const oppositeConcept = keyTerms[(i + j + 10) % keyTerms.length] || "un autre concept";
                optionText = `${incorrectText} en relation avec ${oppositeConcept}`;
              }
            } else {
              optionText = `Interprétation erronée concernant ${randomConcept1}.`;
            }
          }
          
          // S'assurer que l'option a un contenu minimal
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
        
        // Créer une explication détaillée basée sur le contenu
        const correctOption = options[correctOptionIndex];
        let explanation = `La réponse correcte est "${correctOption.text}"`;
        
        // Enrichir l'explication en fonction de la difficulté
        if (difficulty === 'easy') {
          explanation += `. Cette information apparaît directement dans le document, où ${randomConcept1} est défini et expliqué.`;
        } else if (difficulty === 'medium') {
          explanation += `. En analysant le contenu du document, on peut établir cette relation entre ${randomConcept1} et ${randomConcept2}, car le texte développe les impacts et influences mutuelles.`;
        } else {
          explanation += `. Cette conclusion peut être déduite en synthétisant plusieurs passages du document qui abordent ${randomConcept1} et ${randomConcept2}, notamment dans le contexte théorique présenté.`;
        }
        
        // Ajouter une référence à la source dans l'explication
        if (contentSource) {
          explanation += ` On peut notamment se référer au passage: "${contentSource.substring(0, 70)}..."`;
        }
        
        questions.push({
          id,
          text: questionText,
          options,
          explanation,
          difficulty
        });
      } catch (questionError) {
        console.error(`Erreur lors de la génération de la question ${i + 1}:`, questionError);
        // Ajouter une question de secours en cas d'erreur
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
    
    console.log(`${questions.length} questions générées avec succès`);
    return questions;
    
  } catch (error) {
    console.error('Erreur dans generateQuestionsFromText:', error);
    // Retourner des questions de secours basiques si la logique principale échoue
    return generateFallbackQuestions(numQuestions, difficulty);
  }
}
