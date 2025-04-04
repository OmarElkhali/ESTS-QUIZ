
# Flask API pour la génération de quiz avec Qwen
from flask import Flask, request, jsonify
import json
import requests
import logging
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Clé API OpenRouter pour Qwen
OPENROUTER_API_KEY = "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"

@app.route('/api/generate', methods=['POST'])
def generate_questions():
    try:
        # Récupérer les données du corps de la requête
        data = request.json
        text = data.get('text', '')
        num_questions = data.get('numQuestions', 10)
        difficulty = data.get('difficulty', 'medium')
        additional_info = data.get('additionalInfo', '')
        
        logger.info(f"Génération de {num_questions} questions, difficulté: {difficulty}")
        
        # Construire le prompt
        prompt = f"""
        Génère {num_questions} questions de quiz QCM en français basées sur le texte fourni.
        Niveau de difficulté: {difficulty}
        
        Texte: """{text[:3000]}"""
        
        {"Informations supplémentaires: " + additional_info if additional_info else ""}
        
        INSTRUCTIONS:
        1. Chaque question doit provenir directement du texte fourni
        2. Les questions doivent être diverses et couvrir différents aspects du texte
        3. Pour chaque question, crée 4 options avec UNE SEULE réponse correcte
        4. Niveau {difficulty}: {"questions basiques testant la compréhension générale" if difficulty == "easy" else "questions plus nuancées nécessitant une bonne compréhension" if difficulty == "medium" else "questions complexes nécessitant une analyse approfondie"}
        5. Fournis une explication claire pour chaque réponse correcte
        """
        
        # Appel à OpenRouter pour Qwen
        logger.info("Appel de l'API OpenRouter...")
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
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
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
            validated_questions = []
            for i, q in enumerate(questions):
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
                        normalized_options.append({
                            "id": opt.get('id', f"{question_id}_{chr(97+j)}"),
                            "text": opt.get('text', f"Option {chr(65+j)}"),
                            "isCorrect": bool(opt.get('isCorrect'))
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
            
            logger.info(f"{len(validated_questions)} questions générées avec succès")
            return jsonify({"questions": validated_questions})
            
        except json.JSONDecodeError as e:
            logger.error(f"Erreur de décodage JSON: {e}")
            return jsonify({"error": f"Format de réponse invalide: {e}"}), 500
        
    except Exception as e:
        logger.error(f"Erreur: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "L'API Python est en ligne"})

if __name__ == '__main__':
    logger.info("Démarrage de l'API Flask pour la génération de quiz")
    app.run(host='0.0.0.0', port=5000, debug=False)
