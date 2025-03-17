
import { supabase } from '@/integrations/supabase/client';

// Fonction pour télécharger un fichier vers Supabase Storage
export const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
  try {
    // Create a clean filename without spaces and special characters for Supabase Storage
    // Remove any accents, special characters, and spaces
    const cleanFileName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.]/g, '_'); // Replace special chars with underscore
    
    // Créer un chemin unique pour le fichier avec un format que Supabase accepte
    const filePath = `${Date.now()}_${cleanFileName}`;
    
    console.log("Uploading file to Supabase:", filePath);
    
    // Verify if supabase client is properly initialized
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    
    // Upload the file to the quiz-files bucket
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
    
    if (!data) {
      throw new Error('Upload completed but no data was returned');
    }
    
    // Get the public URL of the file
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
