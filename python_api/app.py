
# Flask API pour la génération de quiz avec différents modèles d'IA
from flask import Flask, request, jsonify
import json
import requests
import logging
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Clés API pour les différents modèles
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "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")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAzFO0MGD9VlAHSIUyrxuhlAAltmoxT5uE")

@app.route('/api/generate', methods=['POST'])
def generate_questions():
    try:
        # Récupérer les données du corps de la requête
        data = request.json
        text = data.get('text', '')
        num_questions = data.get('numQuestions', 10)
        difficulty = data.get('difficulty', 'medium')
        additional_info = data.get('additionalInfo', '')
        model_type = data.get('modelType', 'qwen')
        
        logger.info(f"Génération de {num_questions} questions, difficulté: {difficulty}, modèle: {model_type}")
        
        # Choisir le modèle en fonction du type demandé
        if model_type == 'qwen':
            return generate_with_qwen(text, num_questions, difficulty, additional_info)
        elif model_type == 'gemini':
            return generate_with_gemini(text, num_questions, difficulty, additional_info)
        else:
            logger.error(f"Type de modèle non reconnu: {model_type}")
            return jsonify({"error": f"Type de modèle non reconnu: {model_type}"}), 400
        
    except Exception as e:
        logger.error(f"Erreur générale: {e}")
        return jsonify({"error": str(e)}), 500

def generate_with_qwen(text, num_questions, difficulty, additional_info):
    """Génère des questions en utilisant le modèle Qwen via OpenRouter"""
    
    logger.info(f"Génération avec Qwen: {num_questions} questions, difficulté: {difficulty}")
    
    # Construire le prompt
    prompt = f"""
    Génère {num_questions} questions de quiz QCM en français basées sur le texte fourni.
    Niveau de difficulté: {difficulty}
    
    Texte: """{text[:5000]}"""
    
    {"Informations supplémentaires: " + additional_info if additional_info else ""}
    
    INSTRUCTIONS:
    1. Chaque question doit provenir directement du texte fourni
    2. Les questions doivent être diverses et couvrir différents aspects du texte
    3. Pour chaque question, crée 4 options avec UNE SEULE réponse correcte
    4. Niveau {difficulty}: {"questions basiques testant la compréhension générale" if difficulty == "easy" else "questions plus nuancées nécessitant une bonne compréhension" if difficulty == "medium" else "questions complexes nécessitant une analyse approfondie"}
    5. Fournis une explication claire pour chaque réponse correcte
    """
    
    # Appel à OpenRouter pour Qwen
    logger.info("Appel de l'API OpenRouter pour Qwen...")
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://quizai.app", 
        "X-Title": "QuizAI Application",
        "Content-Type": "application/json"
    }
    
    payload = {
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
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if not response.ok:
            logger.error(f"Erreur OpenRouter: {response.status_code} {response.text}")
            return jsonify({"error": f"Erreur OpenRouter: {response.status_code}"}), 500
        
        # Traiter la réponse
        result = response.json()
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        if not content:
            logger.error("Réponse vide depuis OpenRouter")
            return jsonify({"error": "Réponse vide depuis l'API"}), 500
        
        # Traiter la réponse JSON
        try:
            parsed_content = json.loads(content)
            
            # Extraire les questions
            questions = []
            if isinstance(parsed_content, list):
                questions = parsed_content
            elif parsed_content.get('questions') and isinstance(parsed_content['questions'], list):
                questions = parsed_content['questions']
            else:
                # Tenter de trouver un tableau
                for value in parsed_content.values():
                    if isinstance(value, list) and len(value) > 0:
                        questions = value
                        break
            
            # Validation et formatage des questions
            validated_questions = format_questions(questions, num_questions, difficulty)
            
            logger.info(f"{len(validated_questions)} questions générées avec succès via Qwen")
            return jsonify({"questions": validated_questions})
            
        except json.JSONDecodeError as e:
            logger.error(f"Erreur de décodage JSON: {e}")
            return jsonify({"error": f"Format de réponse invalide: {e}"}), 500
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Erreur de requête OpenRouter: {e}")
        # Générer des questions de secours
        fallback_questions = generate_fallback_questions(num_questions, difficulty)
        return jsonify({
            "warning": "Erreur lors de l'appel à OpenRouter, utilisation de questions de secours",
            "questions": fallback_questions
        })

def generate_with_gemini(text, num_questions, difficulty, additional_info):
    """Génère des questions en utilisant le modèle Gemini de Google"""
    
    logger.info(f"Génération avec Gemini: {num_questions} questions, difficulté: {difficulty}")
    
    # Construire le prompt
    prompt = f"""
    Génère {num_questions} questions de quiz QCM en français basées sur le texte fourni.
    Niveau de difficulté: {difficulty}
    
    Texte: """{text[:5000]}"""
    
    {"Informations supplémentaires: " + additional_info if additional_info else ""}
    
    INSTRUCTIONS:
    1. Chaque question doit provenir directement du texte fourni
    2. Les questions doivent être diverses et couvrir différents aspects du texte
    3. Pour chaque question, crée 4 options avec UNE SEULE réponse correcte
    4. Niveau {difficulty}: {"questions basiques testant la compréhension générale" if difficulty == "easy" else "questions plus nuancées nécessitant une bonne compréhension" if difficulty == "medium" else "questions complexes nécessitant une analyse approfondie"}
    5. Fournis une explication claire pour chaque réponse correcte
    
    FORMAT DE RÉPONSE:
    Tu dois fournir un tableau JSON valide contenant les questions comme ceci:
    
    [
      {{
        "id": "q1",
        "text": "Question 1?",
        "options": [
          {{"id": "q1_a", "text": "Option A", "isCorrect": false}},
          {{"id": "q1_b", "text": "Option B", "isCorrect": true}},
          {{"id": "q1_c", "text": "Option C", "isCorrect": false}},
          {{"id": "q1_d", "text": "Option D", "isCorrect": false}}
        ],
        "explanation": "Explication pourquoi B est correct",
        "difficulty": "{difficulty}"
      }}
    ]
    """
    
    # Appel à l'API Gemini
    logger.info("Appel de l'API Gemini...")
    try:
        response = requests.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
            headers={
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.8,
                    "topK": 40
                }
            },
            timeout=120
        )
        
        if not response.ok:
            logger.error(f"Erreur Gemini: {response.status_code} {response.text}")
            return jsonify({"error": f"Erreur Gemini: {response.status_code}"}), 500
        
        # Traiter la réponse
        result = response.json()
        content = ''
        if (result.get('candidates') and 
            len(result['candidates']) > 0 and 
            result['candidates'][0].get('content') and 
            result['candidates'][0]['content'].get('parts') and 
            len(result['candidates'][0]['content']['parts']) > 0):
            content = result['candidates'][0]['content']['parts'][0].get('text', '')
        
        if not content:
            logger.error("Réponse vide depuis Gemini")
            return jsonify({"error": "Réponse vide depuis l'API Gemini"}), 500
        
        # Extraire le JSON de la réponse
        try:
            # Recherche d'un tableau JSON dans la chaîne
            json_match = content.strip()
            questions = []
            
            # Essayer d'extraire le JSON directement
            try:
                questions = json.loads(json_match)
            except json.JSONDecodeError:
                # Essayer d'extraire un tableau JSON encadré par des caractères
                import re
                json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', content)
                if json_match:
                    questions = json.loads(json_match.group())
                else:
                    logger.error("Aucun JSON valide trouvé dans la réponse Gemini")
                    raise json.JSONDecodeError("No valid JSON found", "", 0)
            
            # Validation et formatage des questions
            validated_questions = format_questions(questions, num_questions, difficulty)
            
            logger.info(f"{len(validated_questions)} questions générées avec succès via Gemini")
            return jsonify({"questions": validated_questions})
            
        except json.JSONDecodeError as e:
            logger.error(f"Erreur de décodage JSON: {e}")
            return jsonify({"error": f"Format de réponse invalide depuis Gemini: {e}"}), 500
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Erreur de requête Gemini: {e}")
        # Générer des questions de secours
        fallback_questions = generate_fallback_questions(num_questions, difficulty)
        return jsonify({
            "warning": "Erreur lors de l'appel à Gemini, utilisation de questions de secours",
            "questions": fallback_questions
        })

def format_questions(questions, num_questions, difficulty):
    """Formate et valide les questions générées par l'IA"""
    
    if not isinstance(questions, list):
        logger.warning("Les questions reçues ne sont pas dans un format de liste. Génération de questions de secours.")
        return generate_fallback_questions(num_questions, difficulty)
    
    # Limiter au nombre de questions demandé
    limited_questions = questions[:num_questions]
    
    # Valider et normaliser chaque question
    validated_questions = []
    for i, q in enumerate(limited_questions):
        question_id = q.get('id', f"q{i+1}")
        
        # Traiter les options
        options = q.get('options', [])
        if not options or not isinstance(options, list) or len(options) < 2:
            # Créer des options par défaut
            options = [
                {"id": f"{question_id}_a", "text": "Option A", "isCorrect": True},
                {"id": f"{question_id}_b", "text": "Option B", "isCorrect": False},
                {"id": f"{question_id}_c", "text": "Option C", "isCorrect": False},
                {"id": f"{question_id}_d", "text": "Option D", "isCorrect": False}
            ]
        else:
            # Normaliser les options existantes
            normalized_options = []
            for j, opt in enumerate(options):
                if isinstance(opt, dict):
                    normalized_options.append({
                        "id": opt.get('id', f"{question_id}_{chr(97+j)}"),
                        "text": opt.get('text', f"Option {chr(65+j)}"),
                        "isCorrect": bool(opt.get('isCorrect'))
                    })
                else:
                    normalized_options.append({
                        "id": f"{question_id}_{chr(97+j)}",
                        "text": f"Option {chr(65+j)}",
                        "isCorrect": j == 0  # Premier élément correct par défaut
                    })
            options = normalized_options
        
        # Vérifier qu'il y a exactement une réponse correcte
        correct_options = [opt for opt in options if opt.get('isCorrect')]
        if len(correct_options) != 1:
            options[0]['isCorrect'] = True
            for j in range(1, len(options)):
                options[j]['isCorrect'] = False
        
        validated_questions.append({
            "id": question_id,
            "text": q.get('text', f"Question {i+1}?"),
            "options": options,
            "explanation": q.get('explanation', "Aucune explication fournie"),
            "difficulty": q.get('difficulty', difficulty)
        })
    
    # Si nous n'avons pas assez de questions, compléter avec des questions de secours
    if len(validated_questions) < num_questions:
        fallback_count = num_questions - len(validated_questions)
        logger.warning(f"Seulement {len(validated_questions)} questions valides générées. Ajout de {fallback_count} questions de secours.")
        
        for i in range(len(validated_questions), num_questions):
            q_id = f"q{i+1}"
            validated_questions.append({
                "id": q_id,
                "text": f"Question {i+1} (générée automatiquement)?",
                "options": [
                    {"id": f"{q_id}_a", "text": "Option A", "isCorrect": True},
                    {"id": f"{q_id}_b", "text": "Option B", "isCorrect": False},
                    {"id": f"{q_id}_c", "text": "Option C", "isCorrect": False},
                    {"id": f"{q_id}_d", "text": "Option D", "isCorrect": False}
                ],
                "explanation": "Cette question a été générée automatiquement car le système n'a pas pu produire suffisamment de questions valides.",
                "difficulty": difficulty
            })
    
    return validated_questions

def generate_fallback_questions(num_questions, difficulty):
    """Génère des questions de secours en cas d'échec de toutes les API"""
    
    logger.warning(f"Génération de {num_questions} questions de secours")
    questions = []
    
    for i in range(num_questions):
        q_id = f"q{i+1}"
        questions.append({
            "id": q_id,
            "text": f"Question {i+1} sur le document (générée automatiquement en mode secours)?",
            "options": [
                {"id": f"{q_id}_a", "text": "Première option", "isCorrect": True},
                {"id": f"{q_id}_b", "text": "Deuxième option", "isCorrect": False},
                {"id": f"{q_id}_c", "text": "Troisième option", "isCorrect": False},
                {"id": f"{q_id}_d", "text": "Quatrième option", "isCorrect": False}
            ],
            "explanation": "Cette question a été générée automatiquement suite à un problème technique. Les réponses ne reflètent pas nécessairement le contenu du document.",
            "difficulty": difficulty
        })
    
    return questions

@app.route('/api/health', methods=['GET'])
def health_check():
    """Point de terminaison pour vérifier l'état de l'API"""
    logger.info("Vérification de l'état de l'API Flask")
    return jsonify({
        "status": "ok", 
        "message": "L'API Python est en ligne",
        "version": "1.0.1",
        "services": {
            "qwen": True,
            "gemini": True
        }
    })

if __name__ == '__main__':
    logger.info("Démarrage de l'API Flask pour la génération de quiz")
    app.run(host='0.0.0.0', port=5000, debug=False)
