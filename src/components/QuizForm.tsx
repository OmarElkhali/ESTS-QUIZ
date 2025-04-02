
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { FileUpload } from './FileUpload';
import { toast } from 'sonner';
import { BrainCircuit, Share2, ArrowRight, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '@/hooks/useQuiz';
import { useAuth } from '@/context/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// OpenRouter API key pour Qwen
const OPENROUTER_API_KEY = "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";

export const QuizForm = () => {
  const navigate = useNavigate();
  const { createQuiz, isLoading } = useQuiz();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [enableTimeLimit, setEnableTimeLimit] = useState(false);
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  // Changement du modèle par défaut à Qwen
  const [modelType, setModelType] = useState<'openai' | 'qwen' | 'gemini' | 'local'>('qwen');
  
  const handleFileSelect = (file: File) => {
    setFile(file);
    toast.success('Fichier téléchargé avec succès');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Veuillez vous connecter pour créer un quiz');
      return;
    }
    
    if (!file) {
      toast.error('Veuillez télécharger un fichier de cours');
      return;
    }
    
    try {
      console.log(`Création d'un quiz avec ${numQuestions} questions, difficulté: ${difficulty}, modèle: ${modelType}`);
      console.log(`Limite de temps: ${enableTimeLimit ? timeLimit : 'non définie'}`);
      
      // Pour Qwen, on utilise l'API key d'OpenRouter
      const apiKey = modelType === 'qwen' ? OPENROUTER_API_KEY : undefined;
      
      const quizId = await createQuiz(
        file, 
        numQuestions, 
        difficulty, 
        enableTimeLimit ? timeLimit : undefined, 
        additionalInfo,
        apiKey,
        modelType
      );
      
      toast.success(`${numQuestions} questions générées à partir de vos documents!`);
      navigate(`/quiz/${quizId}`);
    } catch (error) {
      console.error("Erreur lors de la création du quiz:", error);
      // L'erreur est gérée dans le contexte de quiz
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6 md:p-8 max-w-xl mx-auto"
    >
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-2 rounded-full bg-primary/10">
          <BrainCircuit className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Créer votre Quiz</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Télécharger votre document</Label>
          <FileUpload onFileSelect={handleFileSelect} />
          <p className="text-xs text-muted-foreground">
            Formats acceptés: PDF, DOCX, TXT (max 10MB)
          </p>
        </div>
        
        <div className="space-y-4">
          <Label>Modèle d'IA pour la génération</Label>
          <Select
            value={modelType}
            onValueChange={(value) => setModelType(value as 'openai' | 'qwen' | 'gemini' | 'local')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un modèle d'IA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qwen">Qwen 2.5 (Recommandé)</SelectItem>
              <SelectItem value="openai">OpenAI (GPT-4o-mini)</SelectItem>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="local">Génération locale</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {modelType === 'qwen' 
              ? "Qwen 2.5 - Modèle performant optimisé pour les contenus éducatifs (gratuit)"
              : modelType === 'openai'
                ? "OpenAI - Haute qualité, nécessite une clé API"
                : modelType === 'gemini'
                  ? "Google Gemini - Bonne alternative gratuite"
                  : "Génération locale - Plus rapide mais moins précis"}
          </p>
        </div>
        
        <div className="space-y-4">
          <Label>Niveau de difficulté</Label>
          <div className="flex space-x-2">
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <Button
                key={level}
                type="button"
                variant={difficulty === level ? "default" : "outline"}
                onClick={() => setDifficulty(level)}
                className={difficulty === level ? "flex-1" : "flex-1"}
              >
                {level === 'easy' ? 'Facile' : level === 'medium' ? 'Moyen' : 'Difficile'}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="num-questions">Nombre de questions</Label>
            <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {numQuestions}
            </span>
          </div>
          <Slider
            id="num-questions"
            value={[numQuestions]}
            min={5}
            max={50}
            step={5}
            onValueChange={(value) => setNumQuestions(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="enable-time-limit" 
              checked={enableTimeLimit}
              onCheckedChange={(checked) => setEnableTimeLimit(checked === true)}
            />
            <Label htmlFor="enable-time-limit">Activer une limite de temps</Label>
          </div>
          
          {enableTimeLimit && (
            <div className="flex items-center space-x-3 pl-6">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="time-limit">Durée (minutes)</Label>
                <Select 
                  value={timeLimit.toString()}
                  onValueChange={(value) => setTimeLimit(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{timeLimit} min</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="additional-info">Informations supplémentaires (Optionnel)</Label>
          <Textarea
            id="additional-info"
            placeholder="Ajoutez des sujets spécifiques à aborder, des styles de questions préférés, ou d'autres détails..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>
        
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            className="w-full btn-shine"
            disabled={isLoading || !file || !user}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                Commencer le Quiz
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full hover-scale"
            disabled={!user}
            onClick={() => navigate('/history')}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Mes Quiz
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
