
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const QuizPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirection immédiate vers la page de quiz sans aucun délai
    if (id) {
      console.log(`QuizPreview: Redirection immédiate vers le quiz ${id}`);
      navigate(`/quiz/${id}`, { replace: true });
    } else {
      console.error('QuizPreview: ID du quiz non spécifié');
      navigate('/', { replace: true });
    }
  }, [id, navigate]);
  
  // Cette page ne s'affiche jamais
  return null;
};

export default QuizPreview;
