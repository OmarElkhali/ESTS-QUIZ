
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuiz } from '@/hooks/useQuiz';
import { Navbar } from '@/components/Navbar';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Question } from '@/types/quiz';

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuiz, submitQuizAnswers, isLoading } = useQuiz();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizLoading, setQuizLoading] = useState(true);

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
        
        // Initialize answers object
        const initialAnswers: Record<string, string> = {};
        quizData.questions.forEach((q: Question) => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (error) {
        console.error('Erreur lors du chargement du quiz:', error);
        toast.error("Impossible de charger le quiz");
      } finally {
        setQuizLoading(false);
      }
    };

    loadQuiz();
  }, [id, getQuiz, navigate]);

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
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionId
    });
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
    // Check if all questions are answered
    const unansweredQuestions = Object.values(answers).filter(answer => !answer).length;
    
    if (unansweredQuestions > 0) {
      const confirmSubmit = confirm(`Vous n'avez pas répondu à ${unansweredQuestions} question(s). Voulez-vous quand même soumettre le quiz ?`);
      if (!confirmSubmit) return;
    }
    
    setIsSubmitting(true);
    
    try {
      const score = await submitQuizAnswers(id!, answers);
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
            <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestionIndex + 1} sur {totalQuestions}</span>
              <span>{Math.round(progress)}% complété</span>
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
                  value={answers[currentQuestion.id]} 
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
