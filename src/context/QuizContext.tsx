
import { createContext } from 'react';
import { QuizContextType } from '@/types/quiz';

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export default QuizContext;
