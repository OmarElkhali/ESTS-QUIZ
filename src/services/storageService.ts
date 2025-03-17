
import { supabase } from '@/integrations/supabase/client';

// Fonction pour télécharger un fichier vers Supabase Storage
export const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
  try {
    // Créer un chemin unique pour le fichier
    const filePath = `courses/${userId}/${Date.now()}_${file.name}`;
    
    console.log("Uploading file to Supabase:", filePath);
    
    // Télécharger le fichier vers le bucket 'quiz-files'
    const { data, error } = await supabase
      .storage
      .from('quiz-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Set to true to overwrite existing files
      });
    
    if (error) {
      console.error("Supabase storage upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Obtenir l'URL publique du fichier
    const fileUrl = supabase
      .storage
      .from('quiz-files')
      .getPublicUrl(filePath).data.publicUrl;
    
    console.log("File uploaded successfully:", fileUrl);
    return fileUrl;
  } catch (error: any) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    throw new Error(`Échec du téléchargement de fichier: ${error.message}`);
  }
};
