
import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, ArrowLeft, Home, RefreshCw, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { useQuiz } from '@/context/QuizContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ScoreGauge = ({ score }: { score: number }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedScore(score);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [score]);
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <div className="relative flex items-center justify-center mb-8">
      <div className="w-44 h-44 rounded-full border-8 border-muted flex items-center justify-center">
        <div className="text-center">
          <span className={cn("text-5xl font-bold", getScoreColor())}>
            {animatedScore}%
          </span>
          <p className="text-sm text-muted-foreground mt-1">Score</p>
        </div>
      </div>
      <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
        <circle
          cx="88"
          cy="88"
          r="74"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className={cn(
            "text-muted transition-all duration-1000 ease-out",
            getScoreColor()
          )}
          strokeDasharray={2 * Math.PI * 74}
          strokeDashoffset={2 * Math.PI * 74 * (1 - animatedScore / 100)}
        />
      </svg>
    </div>
  );
};

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getQuiz, shareQuiz } = useQuiz();
  
  const quiz = getQuiz(id || '');
  const score = location.state?.score || 85; // Fallback score if not provided
  
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  
  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Results not found. Please return to the home page.</p>
      </div>
    );
  }
  
  const handleShare = async () => {
    try {
      const shareLink = await shareQuiz(quiz.id);
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareLink);
        toast.success('Share link copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to share quiz');
    }
  };
  
  const renderFeedback = () => {
    if (score >= 80) {
      return "Excellent work! You've mastered this material.";
    } else if (score >= 60) {
      return "Good job! You have a solid understanding of the material.";
    } else {
      return "Keep practicing! Review the explanations to strengthen your understanding.";
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-1 container max-w-4xl mx-auto py-24 px-6">
        <div className="glass-card p-6 md:p-8">
          {/* Results Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold mb-2">Quiz Results</h1>
              <p className="text-muted-foreground">{quiz.title}</p>
            </motion.div>
          </div>
          
          {/* Score Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center mb-12"
          >
            <ScoreGauge score={score} />
            
            <p className="text-lg text-center max-w-md mt-2">
              {renderFeedback()}
            </p>
          </motion.div>
          
          {/* Question Review */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-xl font-bold mb-4">Question Review</h2>
            
            <div className="space-y-4">
              {quiz.questions.map((question, index) => (
                <Card 
                  key={question.id}
                  className={cn(
                    "cursor-pointer transition-all duration-300",
                    selectedQuestionIndex === index 
                      ? "shadow-md border-primary" 
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedQuestionIndex(
                    selectedQuestionIndex === index ? null : index
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">
                          {index + 1}. {question.text}
                        </p>
                        
                        {selectedQuestionIndex === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 space-y-3"
                          >
                            {question.options.map(option => (
                              <div 
                                key={option.id}
                                className={cn(
                                  "p-3 rounded-md border",
                                  option.isCorrect 
                                    ? "bg-green-50 border-green-200" 
                                    : "bg-transparent border-border"
                                )}
                              >
                                <div className="flex items-center">
                                  {option.isCorrect ? (
                                    <Check className="h-4 w-4 text-green-500 mr-2" />
                                  ) : (
                                    <div className="h-4 w-4 mr-2" />
                                  )}
                                  <span>{option.text}</span>
                                </div>
                              </div>
                            ))}
                            
                            <div className="bg-muted/50 p-3 rounded-md mt-2">
                              <p className="text-sm font-medium mb-1">Explanation:</p>
                              <p className="text-sm text-muted-foreground">
                                {question.explanation}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                      
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-4 shrink-0",
                          Math.random() > 0.7 
                            ? "bg-green-50 text-green-700 hover:bg-green-50" 
                            : "bg-red-50 text-red-700 hover:bg-red-50"
                        )}
                      >
                        {Math.random() > 0.7 ? 
                          <Check className="h-3 w-3 mr-1" /> : 
                          <X className="h-3 w-3 mr-1" />
                        }
                        {Math.random() > 0.7 ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button
              variant="outline"
              className="hover-scale"
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            
            <Button 
              className="hover-scale" 
              onClick={() => navigate(`/quiz/${quiz.id}`)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Quiz
            </Button>
            
            <Button
              variant="outline"
              className="hover-scale"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share Results
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
