
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { FileUpload } from '@/components/FileUpload';
import { BrainCircuit, Share2, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuiz } from '@/hooks/useQuiz';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

// Default OpenAI API key
const DEFAULT_API_KEY = "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";

export const CreateQuizForm = () => {
  const navigate = useNavigate();
  const { createQuiz, isLoading } = useQuiz();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [selectedAI, setSelectedAI] = useState<'openai' | 'local'>('openai');
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  
  // Call the edge function to create storage bucket on component mount
  useEffect(() => {
    const createBucket = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-storage-bucket');
        if (error) {
          console.error('Error creating bucket:', error);
        } else {
          console.log('Storage bucket response:', data);
        }
      } catch (err) {
        console.error('Failed to call create-storage-bucket function:', err);
      }
    };
    
    createBucket();
  }, []);
  
  const handleFileSelect = (file: File) => {
    setFile(file);
    toast.success(`Fichier sélectionné: ${file.name}`);
  };
  
  const handleNumQuestionsChange = (value: number[]) => {
    setNumQuestions(value[0]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }
    
    if (!user) {
      toast.error("Veuillez vous connecter pour créer un quiz");
      return;
    }
    
    try {
      console.log('Starting quiz creation process');
      // Use the API key only when selectedAI is 'openai'
      const apiKeyToUse = selectedAI === 'openai' ? apiKey : undefined;
      
      const quizId = await createQuiz(
        file, 
        numQuestions, 
        additionalInfo,
        apiKeyToUse
      );
      
      toast.success(`${numQuestions} questions générées à partir de vos documents!`);
      navigate(`/quiz/${quizId}`);
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast.error(`Impossible de créer le quiz: ${error.message || "Erreur inconnue"}`);
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6 md:p-8 border border-[#D2691E]/20 max-w-xl mx-auto"
    >
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-2 rounded-full bg-[#D2691E]/10">
          <BrainCircuit className="h-6 w-6 text-[#D2691E]" />
        </div>
        <h2 className="text-2xl font-bold">Paramètres du Quiz</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Télécharger votre document</Label>
          <FileUpload onFileSelect={handleFileSelect} />
        </div>
        
        <div className="space-y-4">
          <Label>Modèle d'IA pour la génération</Label>
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md border ${
                selectedAI === 'openai' ? 'border-[#D2691E]' : 'border-input'
              }`}
              onClick={() => setSelectedAI('openai')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">OpenAI GPT-4o</h3>
                  <p className="text-xs text-muted-foreground">Qualité supérieure, requiert une API key</p>
                </div>
                <div className={`w-4 h-4 rounded-full ${selectedAI === 'openai' ? 'bg-[#D2691E]' : 'bg-muted'}`}></div>
              </div>
            </Card>
            
            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md border ${
                selectedAI === 'local' ? 'border-[#D2691E]' : 'border-input'
              }`}
              onClick={() => setSelectedAI('local')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Local</h3>
                  <p className="text-xs text-muted-foreground">Fonctionne hors ligne, qualité standard</p>
                </div>
                <div className={`w-4 h-4 rounded-full ${selectedAI === 'local' ? 'bg-[#D2691E]' : 'bg-muted'}`}></div>
              </div>
            </Card>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="num-questions">Nombre de questions</Label>
            <span className="text-sm font-medium bg-[#D2691E]/10 text-[#D2691E] px-2 py-0.5 rounded-full">
              {numQuestions}
            </span>
          </div>
          <Slider
            id="num-questions"
            value={[numQuestions]}
            min={5}
            max={50}
            step={5}
            onValueChange={handleNumQuestionsChange}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>25</span>
            <span>50</span>
          </div>
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
        
        {selectedAI === 'openai' && (
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key (Requis)</Label>
            <Input 
              id="api-key" 
              type="password" 
              placeholder="sk-..." 
              className="font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Votre clé API est stockée uniquement sur votre appareil et n'est jamais partagée.
            </p>
          </div>
        )}
        
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            className="w-full btn-shine bg-[#D2691E] hover:bg-[#D2691E]/90"
            disabled={isLoading || !file || !user || (selectedAI === 'openai' && !apiKey)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                Créer le Quiz
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full hover-scale border-[#D2691E]/20 text-[#D2691E] hover:text-[#D2691E]/80"
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
