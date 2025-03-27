
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuiz } from '@/hooks/useQuiz';
import { Navbar } from '@/components/Navbar';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Question } from '@/types/quiz';
import { Progress } from '@/components/ui/progress';

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuiz, submitQuizAnswers, isLoading } = useQuiz();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timePercentage, setTimePercentage] = useState(100);
  const [timeWarning, setTimeWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadQuiz = async () => {
      if (!id) {
        toast.error("ID du quiz non spécifié");
        navigate('/');
        return;
      }

      try {
        const quizData = await getQuiz(id);
        if (!quizData) {
          toast.error("Quiz introuvable");
          navigate('/');
          return;
        }
        
        setQuiz(quizData);
        console.log("Quiz chargé:", quizData);
        
        // Initialisation des réponses
        const initialAnswers: Record<string, string> = {};
        quizData.questions.forEach((q: Question) => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
        console.log("Réponses initialisées:", initialAnswers);

        // Initialisation du timer si timeLimit est défini
        if (quizData.timeLimit) {
          const timeInSeconds = quizData.timeLimit * 60;
          setTimeRemaining(timeInSeconds);
          console.log(`Temps limite défini: ${quizData.timeLimit} minutes (${timeInSeconds} secondes)`);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du quiz:', error);
        toast.error("Impossible de charger le quiz");
      } finally {
        setQuizLoading(false);
      }
    };

    loadQuiz();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [id, getQuiz, navigate]);

  // Initialisation du timer
  useEffect(() => {
    if (timeRemaining !== null && quiz && !timerRef.current) {
      const totalTime = quiz.timeLimit * 60;
      console.log(`Initialisation du timer: ${totalTime} secondes au total`);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null) return null;
          if (prev <= 0) {
            clearInterval(timerRef.current!);
            handleTimeUp();
            return 0;
          }
          
          // Calcul du pourcentage de temps restant
          const newPercentage = (prev / totalTime) * 100;
          setTimePercentage(newPercentage);
          
          // Avertissement lorsqu'il reste moins de 20% du temps
          if (newPercentage < 20 && !timeWarning) {
            setTimeWarning(true);
            toast.warning("Moins de 20% du temps restant !");
          }
          
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, quiz]);

  const handleTimeUp = () => {
    toast.error("Temps écoulé !");
    handleSubmit();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (quizLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-4 text-lg">Chargement du quiz...</p>
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
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerChange = (optionId: string) => {
    console.log(`Réponse sélectionnée: ${optionId} pour la question ${currentQuestion.id}`);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Vérifier si toutes les questions ont reçu une réponse
    const unansweredQuestions = Object.values(answers).filter(answer => !answer).length;
    
    if (unansweredQuestions > 0) {
      const confirmSubmit = confirm(`Vous n'avez pas répondu à ${unansweredQuestions} question(s). Voulez-vous quand même soumettre le quiz ?`);
      if (!confirmSubmit) return;
    }
    
    setIsSubmitting(true);
    console.log("Soumission des réponses:", answers);
    
    // Arrêter le timer s'il est en cours
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const score = await submitQuizAnswers(id!, answers);
      console.log(`Quiz terminé avec un score de ${score}%`);
      navigate(`/results/${id}`, { state: { score, answers } });
    } catch (error) {
      console.error('Erreur lors de la soumission du quiz:', error);
      toast.error("Impossible de soumettre vos réponses");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-1 pt-16 pb-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              
              {timeRemaining !== null && (
                <div className={`flex items-center ${
                  timeWarning ? 'text-red-500 animate-pulse' : 'text-[#D2691E]'
                }`}>
                  <Clock className="mr-2 h-5 w-5" />
                  <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {/* Barre de progression du temps */}
              {timeRemaining !== null && (
                <div className="w-full space-y-1">
                  <Progress 
                    value={timePercentage} 
                    className={`h-2 ${
                      timePercentage > 50 
                        ? 'bg-gray-200' 
                        : timePercentage > 20 
                          ? 'bg-orange-200' 
                          : 'bg-red-200'
                    }`}
                  />
                  <p className="text-xs text-right text-muted-foreground">
                    Temps restant: {formatTime(timeRemaining)}
                  </p>
                </div>
              )}
              
              {/* Barre de progression des questions */}
              <div className="w-full space-y-1">
                <Progress 
                  value={progress} 
                  className="h-2 bg-gray-200"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Question {currentQuestionIndex + 1} sur {totalQuestions}</span>
                  <span>{Math.round(progress)}% complété</span>
                </div>
              </div>
            </div>
            
            {/* Badge de difficulté */}
            <div className="mt-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                currentQuestion.difficulty === 'easy' 
                  ? 'bg-green-100 text-green-800' 
                  : currentQuestion.difficulty === 'medium'
                    ? 'bg-[#D2691E]/10 text-[#D2691E]' 
                    : 'bg-red-100 text-red-800'
              }`}>
                {currentQuestion.difficulty === 'easy' 
                  ? 'Facile' 
                  : currentQuestion.difficulty === 'medium' 
                    ? 'Moyen' 
                    : 'Difficile'}
              </span>
            </div>
          </div>
          
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-[#D2691E]/20 mb-6">
              <CardHeader>
                <CardTitle className="text-xl">
                  {currentQuestion.text}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <RadioGroup 
                  value={answers[currentQuestion.id] || ''} 
                  onValueChange={handleAnswerChange}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option: any) => (
                    <div 
                      key={option.id}
                      className={`flex items-center space-x-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors ${
                        answers[currentQuestion.id] === option.id ? 'bg-primary/10 border-primary/50' : ''
                      }`}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-grow cursor-pointer">{option.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                
                {currentQuestionIndex < totalQuestions - 1 ? (
                  <Button 
                    onClick={handleNextQuestion}
                    className="bg-[#D2691E] hover:bg-[#D2691E]/90"
                  >
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Soumission...
                      </>
                    ) : (
                      <>
                        Terminer
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleSubmit}
              className="text-[#D2691E]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Soumission...
                </>
              ) : (
                'Terminer le quiz maintenant'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
