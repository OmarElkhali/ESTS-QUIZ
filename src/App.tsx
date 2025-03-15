import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import History from './pages/History';
import { QuizProvider } from '@/context/index';

const queryClient = new QueryClient()

function App() {
  return (
    <>
      <BrowserRouter>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <QuizProvider>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/quiz/:id" element={<Quiz />} />
                  <Route path="/results/:id" element={<Results />} />
                  <Route path="/history/:id" element={<History />} />
                </Routes>
              </QuizProvider>
            </AuthProvider>
          </QueryClientProvider>
        </TooltipProvider>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
