
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useQuiz } from '@/hooks/useQuiz';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { getFirebaseBackupQuestions } from '@/services/aiService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuiz, submitQuizAnswers, isLoading } = useQuiz();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadRetries, setLoadRetries] = useState(0);
  const [isLoadingBackup, setIsLoadingBackup] = useState(false);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchQuiz = async () => {
      try {
        setError(null);
        setIsLoadingBackup(false);
        
        const quizData = await getQuiz(id);
        
        if (!quizData) {
          throw new Error("Quiz non trouvé");
        }
        
        // Vérifier si le quiz a des questions
        if (!quizData.questions || quizData.questions.length === 0) {
          console.warn("Quiz sans questions, création d'un quiz de secours");
          setIsLoadingBackup(true);
          
          // Créer un quiz de secours
          const backupQuestions = await getFirebaseBackupQuestions();
          quizData.questions = backupQuestions;
          quizData.title = quizData.title || "Quiz de secours";
          quizData.description = "Quiz généré automatiquement - Mode de secours";
          
          setIsLoadingBackup(false);
        }
        
        setQuiz(quizData);
        
        // Initialize timeLeft if quiz has a time limit
        if (quizData && quizData.timeLimit) {
          setTimeLeft(quizData.timeLimit * 60); // Convert minutes to seconds
        }
        
        // Initialize empty answers object
        if (quizData && quizData.questions) {
          const initialAnswers: Record<string, string> = {};
          quizData.questions.forEach((q: any) => {
            initialAnswers[q.id] = '';
          });
          setAnswers(initialAnswers);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setError("Impossible de charger le quiz. Chargement du quiz de secours...");
        
        // Si l'erreur persiste après plusieurs tentatives, créer un quiz de secours
        if (loadRetries >= 1) {
          setIsLoadingBackup(true);
          try {
            // Créer un quiz de secours avec des questions par défaut
            const backupQuestions = await getFirebaseBackupQuestions();
            const backupQuiz = {
              id: id,
              title: "Quiz de secours",
              description: "Quiz généré automatiquement suite à une erreur",
              questions: backupQuestions,
              createdAt: new Date().toISOString().split('T')[0],
              timeLimit: 30,
              difficulty: "medium"
            };
            
            setQuiz(backupQuiz);
            
            // Initialiser les réponses vides
            const initialAnswers: Record<string, string> = {};
            backupQuestions.forEach((q: any) => {
              initialAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
            
            // Initialiser le temps restant
            setTimeLeft(30 * 60); // 30 minutes
            
            setError(null);
          } catch (backupError) {
            console.error('Error creating backup quiz:', backupError);
            setError("Impossible de charger le quiz de secours. Veuillez réessayer.");
          } finally {
            setIsLoadingBackup(false);
          }
        } else {
          // Incrémenter le compteur de tentatives et réessayer
          setLoadRetries(prev => prev + 1);
        }
      }
    };
    
    fetchQuiz();
  }, [id, getQuiz, loadRetries]);
  
  // Timer countdown effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    
    const timerId = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(timerId);
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft]);
  
  if (!user) {
    return <Navigate to="/" />;
  }
  
  if (isLoading || isLoadingBackup || !quiz) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">
              {isLoadingBackup ? "Chargement du quiz de secours..." : "Chargement du quiz..."}
            </p>
            
            {error && (
              <Alert variant="destructive" className="mt-4 max-w-md mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>
                  {error}
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => setLoadRetries(prev => prev + 1)}>
                      Réessayer
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };
  
  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter((q: any) => !answers[q.id]);
    
    if (unansweredQuestions.length > 0 && timeLeft !== 0) {
      toast.warning(`Il reste ${unansweredQuestions.length} question(s) sans réponse`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const score = await submitQuizAnswers(quiz.id, answers);
      navigate(`/results/${quiz.id}`, { state: { score, answers } });
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('Erreur lors de la soumission des réponses');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              {timeLeft !== null && (
                <div className="flex items-center bg-amber-50 text-amber-700 px-3 py-1.5 rounded-md">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="font-medium">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-muted-foreground">
                Question {currentQuestionIndex + 1} sur {quiz.questions.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            
            <Progress value={progress} className="h-2 mb-8" />
            
            <Card className="mb-8">
              <CardContent className="pt-6">
                <h2 className="text-xl font-medium mb-6">{currentQuestion.text}</h2>
                
                <RadioGroup 
                  value={answers[currentQuestion.id]} 
                  onValueChange={(value) => handleSelectAnswer(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option: any) => (
                    <div
                      key={option.id}
                      className={`
                        flex items-center space-x-2 border rounded-lg p-4 transition-all
                        ${answers[currentQuestion.id] === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label
                        htmlFor={option.id}
                        className="flex-1 cursor-pointer font-normal py-2"
                      >
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
              
              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Soumission...' : 'Terminer le quiz'}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
