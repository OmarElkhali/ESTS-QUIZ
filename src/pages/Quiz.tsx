
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { useQuiz } from '@/hooks/useQuiz';
import { cn } from '@/lib/utils';
import { Quiz as QuizType } from '@/types/quiz';

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuiz, submitQuizAnswers } = useQuiz();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      try {
        const quizData = await getQuiz(id);
        setQuiz(quizData);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        toast.error('Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuiz();
  }, [id, getQuiz]);
  
  useEffect(() => {
    if (!quiz) return;
    
    // Set up timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quiz]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading quiz...</p>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Quiz not found. Please return to the home page.</p>
      </div>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  };
  
  const handleSubmit = async () => {
    // Check if all questions are answered
    const answeredQuestions = Object.keys(selectedAnswers).length;
    
    if (answeredQuestions < quiz.questions.length) {
      const isConfirmed = window.confirm(`You've only answered ${answeredQuestions} out of ${quiz.questions.length} questions. Are you sure you want to submit?`);
      
      if (!isConfirmed) return;
    }
    
    setIsSubmitting(true);
    
    try {
      const score = await submitQuizAnswers(quiz.id, selectedAnswers);
      navigate(`/results/${quiz.id}`, { state: { score } });
    } catch (error) {
      toast.error('Failed to submit quiz');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-1 container max-w-4xl mx-auto py-24 px-6">
        <div className="glass-card p-6 md:p-8 overflow-hidden">
          {/* Quiz Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-4">{quiz.title}</h1>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-1 text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm font-medium">
                  <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                  <span className={cn(
                    timeLeft < 60 && "text-destructive animate-pulse"
                  )}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                
                <Button variant="outline" size="sm" className="h-8">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
            
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Question Content */}
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h2 className="text-xl font-medium mb-6">
                    {currentQuestion.text}
                  </h2>
                  
                  <RadioGroup
                    value={selectedAnswers[currentQuestion.id]}
                    onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                    className="space-y-4"
                  >
                    {currentQuestion.options.map((option) => (
                      <Card 
                        key={option.id}
                        className={cn(
                          "cursor-pointer overflow-hidden transition-all duration-300",
                          selectedAnswers[currentQuestion.id] === option.id 
                            ? "border-primary shadow-md" 
                            : "hover:border-primary/50"
                        )}
                      >
                        <CardContent className="p-0">
                          <Label
                            htmlFor={`option-${option.id}`}
                            className="flex items-center p-4 cursor-pointer"
                          >
                            <RadioGroupItem 
                              value={option.id} 
                              id={`option-${option.id}`}
                              className="mr-4" 
                            />
                            <span>{option.text}</span>
                          </Label>
                        </CardContent>
                      </Card>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="hover-scale"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-shine"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-b-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} className="hover-scale">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;
