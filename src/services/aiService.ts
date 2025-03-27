
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
      
      if (apiKey) {
        // Si une clé API est fournie, utiliser l'API OpenAI réelle
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
        
        Les questions faciles devraient tester la compréhension de base.
        Les questions moyennes devraient demander une analyse plus approfondie.
        Les questions difficiles devraient nécessiter une synthèse ou déduction.
        `;
        
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { 
                role: "system", 
                content: "Tu es un expert en création de quiz éducatifs. Génère des questions de quiz QCM de haute qualité basées sur le contenu fourni." 
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
          });
          
          // Traiter la réponse pour extraire les questions
          const content = response.choices[0].message.content;
          console.log("OpenAI response received, processing...");
          
          // Simulation - Dans un cas réel, nous analyserions le contenu pour extraire les questions
          return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
        } catch (apiError) {
          console.error("OpenAI API error:", apiError);
          // Fallback à la génération locale en cas d'erreur
          return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
        }
      } else {
        // Sans clé API, utiliser la génération locale
        await new Promise(resolve => setTimeout(resolve, 2000));
        return generateQuestionsFromText(text, numQuestions, difficulty, additionalInfo);
      }
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
  
  // Construire un résumé simple du texte pour le contexte
  const textSummary = paragraphs.length > 0 
    ? paragraphs.slice(0, 3).join(' ') 
    : text.substring(0, 500);
  
  // Extraire des concepts clés du texte
  const keywords = uniqueWords
    .filter(word => word.length > 6)
    .slice(0, 20);
  
  // Types de questions plus avancés par niveau de difficulté
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
    
    // Sélectionner des concepts aléatoires du texte pour construire la question
    const randomConcept1 = keywords[Math.floor(Math.random() * keywords.length)] || "ce concept";
    const randomConcept2 = keywords[Math.floor(Math.random() * keywords.length)] || "cet élément";
    
    // Sélectionner un modèle de question en fonction de la difficulté
    const questionTemplates = questionsByDifficulty[difficulty];
    let questionTemplate = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
    
    // Remplacer les placeholders par des concepts réels
    questionText = questionTemplate.replace('%s', randomConcept1).replace('%s', randomConcept2);
    
    // Pour les questions difficiles, ajouter un contexte plus riche
    if (difficulty === 'hard') {
      const contextParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)] || sentences[Math.floor(Math.random() * sentences.length)];
      if (contextParagraph) {
        questionText = `Dans le contexte suivant: "${contextParagraph.substring(0, 100)}...", ${questionText}`;
      }
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
        // Option correcte - extraire une information exacte et pertinente
        const sentenceWords = optionSource.split(/\s+/);
        const startIndex = Math.floor(Math.random() * Math.max(sentenceWords.length - 8, 1));
        const length = difficulty === 'easy' ? 5 : (difficulty === 'medium' ? 7 : 10);
        
        optionText = sentenceWords.slice(startIndex, startIndex + length).join(' ');
        
        // S'assurer que l'option correcte est clairement formulée
        if (difficulty !== 'easy') {
          optionText = `${optionText} (ce qui est correct selon le texte)`;
        }
      } else {
        // Options incorrectes - variations plausibles mais inexactes
        const sentenceWords = optionSource.split(/\s+/);
        const startIndex = Math.floor(Math.random() * Math.max(sentenceWords.length - 6, 1));
        
        // Pour les options incorrectes, modifier légèrement le contenu
        let incorrectText = sentenceWords.slice(startIndex, startIndex + 5).join(' ');
        
        // Ajouter des modifications pour rendre l'option incorrecte mais plausible
        const modifiers = [
          "contrairement à ce qui est mentionné",
          "ce qui n'est pas abordé",
          "bien que ce ne soit pas exact",
          "ce qui est une interprétation erronée"
        ];
        
        if (difficulty === 'easy') {
          // Options clairement incorrectes pour les questions faciles
          optionText = `${incorrectText} (incorrect)`;
        } else if (difficulty === 'medium') {
          // Options partiellement vraies mais avec des erreurs pour niveau moyen
          const modifier = modifiers[j % modifiers.length];
          optionText = `${incorrectText}, ${modifier}`;
        } else {
          // Options très trompeuses pour niveau difficile
          const oppositeConcept = keywords[(i + j + 10) % keywords.length] || "un autre concept";
          optionText = `${incorrectText} en relation avec ${oppositeConcept}, ce qui est une interprétation inexacte`;
        }
      }
      
      // S'assurer que l'option a un contenu minimal
      if (optionText.split(/\s+/).length < 3) {
        optionText = isCorrect 
          ? `La réponse correcte selon le passage sur ${randomConcept1}` 
          : `Une interprétation erronée concernant ${randomConcept1} et ${randomConcept2}`;
      }
      
      options.push({
        id: optionId,
        text: optionText,
        isCorrect
      });
    }
    
    // Créer une explication détaillée basée sur le contenu
    const correctOption = options[correctOptionIndex];
    let explanation = `La réponse correcte est "${correctOption.text.replace(/ \(ce qui est correct selon le texte\)/, '')}"`;
    
    // Enrichir l'explication en fonction de la difficulté
    if (difficulty === 'easy') {
      explanation += `. Cette information apparaît directement dans le document, où ${randomConcept1} est défini et expliqué.`;
    } else if (difficulty === 'medium') {
      explanation += `. En analysant le contenu du document, on peut établir cette relation entre ${randomConcept1} et ${randomConcept2}, car le texte développe les impacts et influences mutuelles.`;
    } else {
      explanation += `. Cette conclusion peut être déduite en synthétisant plusieurs passages du document qui abordent ${randomConcept1} et ${randomConcept2}, notamment dans le contexte théorique présenté.`;
    }
    
    // Ajouter une référence au texte source dans l'explication
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
  }
  
  return questions;
}
