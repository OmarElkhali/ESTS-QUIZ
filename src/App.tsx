
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from './context/AuthContext';
import Index from './pages/Index';
import CreateQuiz from './pages/CreateQuiz';
import QuizPreview from './pages/QuizPreview';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import QuizHistory from './pages/QuizHistory';
import NotFound from './pages/NotFound';
import { QuizProvider } from '@/context/index';

const queryClient = new QueryClient()

function App() {
  return (
    <React.Fragment>
      <BrowserRouter>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <QuizProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/create-quiz" element={<CreateQuiz />} />
                  <Route path="/quiz-preview/:id" element={<QuizPreview />} />
                  <Route path="/quiz/:id" element={<Quiz />} />
                  <Route path="/results/:id" element={<Results />} />
                  <Route path="/history" element={<QuizHistory />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuizProvider>
            </AuthProvider>
          </QueryClientProvider>
        </TooltipProvider>
      </BrowserRouter>
      <Toaster />
    </React.Fragment>
  );
}

export default App;
