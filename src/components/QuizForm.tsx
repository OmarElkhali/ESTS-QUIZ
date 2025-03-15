
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { FileUpload } from './FileUpload';
import { toast } from 'sonner';
import { BrainCircuit, Share2, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '@/hooks/useQuiz';
import { useAuth } from '@/context/AuthContext';

export const QuizForm = () => {
  const navigate = useNavigate();
  const { createQuiz, isLoading } = useQuiz();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [additionalInfo, setAdditionalInfo] = useState('');
  
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
      const quizId = await createQuiz(file, numQuestions, additionalInfo);
      toast.success(`${numQuestions} questions générées à partir de vos documents!`);
      navigate(`/quiz/${quizId}`);
    } catch (error) {
      // Error is handled in the quiz context
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
