
import { supabase } from '@/integrations/supabase/client';

// Fonction pour télécharger un fichier vers Supabase Storage
export const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
  try {
    // Créer un chemin unique pour le fichier
    const filePath = `courses/${userId}/${file.name}_${Date.now()}`;
    
    // Télécharger le fichier vers le bucket 'quiz-files'
    const { data, error } = await supabase
      .storage
      .from('quiz-files')
      .upload(filePath, file);
    
    if (error) {
      throw error;
    }
    
    // Obtenir l'URL publique du fichier
    const fileUrl = supabase
      .storage
      .from('quiz-files')
      .getPublicUrl(filePath).data.publicUrl;
    
    return fileUrl;
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    throw new Error('Échec du téléchargement de fichier');
  }
};
