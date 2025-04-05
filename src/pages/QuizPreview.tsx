
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuiz } from '@/hooks/useQuiz';
import { Navbar } from '@/components/Navbar';
import { BookOpen, Timer, Info, ListChecks, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const QuizPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuiz, isLoading: contextLoading } = useQuiz();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) {
        setError('ID du quiz non spécifié');
        toast.error('ID du quiz non spécifié');
        navigate('/');
        return;
      }

      try {
        console.log(`Tentative de récupération du quiz: ${id}`);
        setIsLoading(true);
        setError(null);
        const quizData = await getQuiz(id);
        
        if (!quizData) {
          setError('Quiz introuvable. Vérifiez l\'URL ou essayez de créer un nouveau quiz.');
          toast.error('Quiz introuvable');
          return;
        }
        
        console.log('Quiz récupéré avec succès:', quizData);
        setQuiz(quizData);
      } catch (error: any) {
        console.error('Erreur lors du chargement du quiz:', error);
        setError(`Impossible de charger le quiz: ${error.message || 'Erreur inconnue'}`);
        toast.error('Impossible de charger le quiz');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [id, getQuiz, navigate]);

  const handleStartQuiz = () => {
    if (id) {
      navigate(`/quiz/${id}`);
    }
  };

  if (isLoading || contextLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement du quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Button onClick={() => navigate('/create-quiz')} className="mr-2">Créer un nouveau quiz</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold mb-4">Quiz introuvable</p>
            <Button onClick={() => navigate('/create-quiz')} className="mr-2">Créer un nouveau quiz</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center bg-primary/10 p-3 rounded-full mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Votre Quiz est Prêt!</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nous avons généré un quiz personnalisé basé sur vos documents. Révisez les détails ci-dessous avant de commencer.
            </p>
          </motion.div>
          
          <Card className="glass-card border border-[#D2691E]/20 overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6 pb-0">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full">
                      <ListChecks className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Nombre de questions</p>
                      <p className="text-sm text-muted-foreground">
                        {quiz.questions.length} questions
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full">
                      <Timer className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Durée estimée</p>
                      <p className="text-sm text-muted-foreground">
                        {quiz.duration}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {quiz.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Créé le</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Conseil:</strong> Prenez votre temps et lisez attentivement chaque question. Vous pouvez revenir en arrière pour modifier vos réponses avant de soumettre le quiz.
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end pt-8 pb-6">
              <Button 
                onClick={handleStartQuiz}
                className="btn-shine bg-[#D2691E] hover:bg-[#D2691E]/90"
              >
                Commencer le Quiz
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <footer className="bg-muted/30 py-8 px-6 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center">
            <p className="text-sm text-muted-foreground">
              © 2023 ESTS-QUIZ. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default QuizPreview;
