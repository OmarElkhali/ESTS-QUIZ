import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuiz } from '@/hooks/useQuiz';
import { Navbar } from '@/components/Navbar';
import { BookOpen, Timer, Info, ListChecks, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState(2);
  const [redirecting, setRedirecting] = useState(false);

  const fetchQuiz = useCallback(async () => {
    if (!id) {
      console.error('QuizPreview: ID du quiz non spécifié');
      setError('ID du quiz non spécifié');
      toast.error('ID du quiz non spécifié');
      setIsLoading(false);
      navigate('/');
      return;
    }

    try {
      console.log(`QuizPreview: Tentative #${retryCount + 1} de récupération du quiz: ${id}`);
      setIsLoading(true);
      setError(null);
      
      const quizData = await getQuiz(id);
      
      if (!quizData) {
        console.error(`QuizPreview: Quiz non trouvé (ID: ${id})`);
        
        if (retryCount < 2) {
          console.log(`QuizPreview: Nouvelle tentative dans ${retryTimer} secondes...`);
          setIsRetrying(true);
          // Décrémentation du timer à chaque seconde
          const interval = setInterval(() => {
            setRetryTimer(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                setIsRetrying(false);
                setRetryCount(prev => prev + 1);
                setRetryTimer(2);
                return 2;
              }
              return prev - 1;
            });
          }, 1000);
          return;
        }
        
        // Si toutes les tentatives ont échoué, passer directement au quiz
        console.log('QuizPreview: Tentatives épuisées, redirection directe vers le quiz');
        setRedirecting(true);
        setTimeout(() => {
          navigate(`/quiz/${id}`);
        }, 2000);
        return;
      }
      
      console.log('QuizPreview: Quiz récupéré avec succès:', {
        title: quizData.title,
        questionsCount: quizData.questions?.length || 0
      });
      
      // Vérification que les données du quiz sont valides
      if (!quizData.questions || quizData.questions.length === 0) {
        console.error('QuizPreview: Le quiz ne contient pas de questions:', quizData);
        // Si le quiz existe mais n'a pas de questions, rediriger directement vers le quiz
        // pour que le mécanisme de secours soit utilisé
        setRedirecting(true);
        setTimeout(() => {
          navigate(`/quiz/${id}`);
        }, 2000);
        return;
      }
      
      setQuiz(quizData);
      setIsLoading(false);
      setError(null);
      toast.success('Quiz chargé avec succès');
    } catch (error: any) {
      console.error('QuizPreview: Erreur lors du chargement du quiz:', error);
      
      if (retryCount < 2) {
        console.log(`QuizPreview: Erreur de chargement, nouvelle tentative dans ${retryTimer} secondes...`);
        setIsRetrying(true);
        // Décrémentation du timer à chaque seconde
        const interval = setInterval(() => {
          setRetryTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsRetrying(false);
              setRetryCount(prev => prev + 1);
              setRetryTimer(2);
              return 2;
            }
            return prev - 1;
          });
        }, 1000);
        return;
      }
      
      // Si toutes les tentatives ont échoué, passer directement au quiz
      console.log('QuizPreview: Tentatives épuisées après erreur, redirection directe vers le quiz');
      setRedirecting(true);
      setTimeout(() => {
        navigate(`/quiz/${id}`);
      }, 2000);
    }
  }, [id, getQuiz, navigate, retryCount, retryTimer]);

  useEffect(() => {
    if (!isRetrying) {
      fetchQuiz();
    }
  }, [fetchQuiz, isRetrying]);

  const handleStartQuiz = () => {
    if (id) {
      console.log(`QuizPreview: Démarrage du quiz: ${id}`);
      navigate(`/quiz/${id}`);
    }
  };

  const handleRefresh = () => {
    console.log('QuizPreview: Actualisation manuelle du quiz');
    setRetryCount(0);
    setIsRetrying(false);
    setIsLoading(true);
    fetchQuiz();
  };

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Redirection vers le quiz en mode secours...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || contextLoading || isRetrying) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              {isRetrying 
                ? `Nouvelle tentative dans ${retryTimer} secondes... (${retryCount + 1}/3)` 
                : 'Chargement du quiz...'}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Le chargement est un peu long. Veuillez patienter...
              </p>
            )}
            <div className="mt-4">
              <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Actualiser maintenant
              </Button>
            </div>
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
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Button onClick={handleRefresh} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={() => navigate('/create-quiz')} variant="secondary">
                Créer un nouveau quiz
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
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
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={handleRefresh} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={() => navigate('/create-quiz')} variant="secondary">
                Créer un nouveau quiz
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz?.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Quiz incomplet</AlertTitle>
              <AlertDescription>
                Le quiz a été créé mais ne contient pas de questions. Veuillez essayer de créer un nouveau quiz.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Button onClick={handleRefresh} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={() => navigate('/create-quiz')} variant="secondary">
                Créer un nouveau quiz
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </div>
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
              <CardTitle className="text-2xl">{quiz?.title}</CardTitle>
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
                        {quiz?.questions?.length || 0} questions
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
                        {quiz?.timeLimit ? `${quiz.timeLimit} min` : `${Math.max(10, quiz?.questions?.length * 1.5)} min environ`}
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
                        {quiz?.description || 'Quiz généré par IA basé sur vos documents.'}
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
                        {quiz?.createdAt && new Date(quiz.createdAt).toLocaleDateString()}
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
