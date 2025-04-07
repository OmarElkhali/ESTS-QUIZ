
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

const QuizPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirection automatique vers la page de quiz
    if (id) {
      console.log(`QuizPreview: Redirection automatique vers le quiz ${id}`);
      navigate(`/quiz/${id}`);
    } else {
      console.error('QuizPreview: ID du quiz non spécifié');
      navigate('/');
    }
  }, [id, navigate]);
  
  // Page temporaire pendant la redirection (ne devrait s'afficher que brièvement)
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            Redirection vers le quiz...
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizPreview;
