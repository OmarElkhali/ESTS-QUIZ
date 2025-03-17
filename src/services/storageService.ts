
import { supabase } from '@/integrations/supabase/client';

// Function to validate if supabase client is properly initialized
const validateSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
};

// Function to upload a file to Supabase Storage
export const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
  try {
    // Validate the Supabase client
    validateSupabaseClient();
    
    // Create a clean filename without spaces and special characters for Supabase Storage
    // Remove any accents, special characters, and spaces
    const cleanFileName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.]/g, '_'); // Replace special chars with underscore
    
    // Create a unique path for the file in a format accepted by Supabase
    const filePath = `${Date.now()}_${cleanFileName}`;
    
    console.log("Uploading file to Supabase:", filePath);
    
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
    const { data: urlData } = supabase
      .storage
      .from('quiz-files')
      .getPublicUrl(filePath);
      
    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }
    
    console.log("File uploaded successfully:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
