
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuthDialog } from './AuthDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, X, User, History } from 'lucide-react';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  
  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 px-6",
        isScrolled ? "glass-panel shadow-sm" : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tight hover-scale">
          QuizFlick
        </Link>
        
        {!isMobile ? (
          <nav className="flex items-center space-x-8">
            <Link to="/" className="font-medium underline-animation">
              Home
            </Link>
            <Link to="/history" className="font-medium underline-animation">
              History
            </Link>
            <Button 
              onClick={() => setShowAuthDialog(true)} 
              variant="secondary"
              className="ml-4 hover-scale"
            >
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </nav>
        ) : (
          <Button variant="ghost" size="icon" onClick={toggleMenu}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        )}
      </div>
      
      {/* Mobile menu */}
      {isMobile && isOpen && (
        <div className="container mx-auto mt-4 py-4 glass-panel rounded-xl animate-fade-in">
          <nav className="flex flex-col space-y-4">
            <Link 
              to="/" 
              className="px-4 py-2 rounded-md hover:bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/history" 
              className="px-4 py-2 rounded-md hover:bg-secondary transition-colors flex items-center"
              onClick={() => setIsOpen(false)}
            >
              <History className="mr-2 h-4 w-4" /> 
              History
            </Link>
            <Button 
              onClick={() => {
                setShowAuthDialog(true);
                setIsOpen(false);
              }}
              className="w-full justify-start"
            >
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </nav>
        </div>
      )}
      
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </header>
  );
};
