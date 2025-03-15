
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthDialog } from './AuthDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileText, Share2, History, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard = ({ icon, title, description, delay }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="glass-card p-6 hover-scale"
  >
    <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </motion.div>
);

export const Hero = () => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const isMobile = useIsMobile();
  
  return (
    <section className="pt-32 pb-16 px-6">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Content */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 space-y-6"
          >
            <div className="space-y-2">
              <div className="inline-block bg-primary/10 text-primary font-medium rounded-full px-4 py-1 text-sm mb-4">
                AI-Powered Learning
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Transform Your Study Materials Into Interactive Quizzes
              </h1>
              <p className="text-xl text-muted-foreground mt-6">
                Upload your course materials and let our AI create personalized quizzes to test your knowledge. Share with friends and track your progress.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={() => setShowAuthDialog(true)} 
                size="lg"
                className="btn-shine"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="hover-scale"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 relative aspect-square max-w-md"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full blur-3xl opacity-20 animate-pulse-soft" />
            <div className="relative glass-card overflow-hidden aspect-square rounded-3xl border border-white/20 shadow-xl flex items-center justify-center">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              <img
                src="/placeholder.svg"
                alt="Quiz App Interface"
                className="w-4/5 h-4/5 object-cover rounded-xl shadow-lg animate-float"
              />
            </div>
          </motion.div>
        </div>
        
        {/* Features */}
        <div className="mt-32 mb-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Key Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              QuizFlick combines AI intelligence with elegant design to create the ultimate learning experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileText className="h-6 w-6 text-primary" />}
              title="AI Question Generation"
              description="Upload your study materials and our AI will generate relevant quiz questions tailored to your content."
              delay={0.1}
            />
            <FeatureCard
              icon={<Share2 className="h-6 w-6 text-primary" />}
              title="Collaborative Quizzes"
              description="Share quizzes with friends and take them together in real-time for a social learning experience."
              delay={0.2}
            />
            <FeatureCard
              icon={<History className="h-6 w-6 text-primary" />}
              title="Comprehensive History"
              description="Review your past quizzes, track your progress, and identify areas for improvement."
              delay={0.3}
            />
          </div>
        </div>
      </div>
      
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </section>
  );
};
