
import { supabase } from '@/integrations/supabase/client';

const validateSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
};

// Function to upload a file to Supabase Storage
export const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
  try {
    // Validate the Supabase client
    validateSupabaseClient();
    
    // Create a clean filename for Supabase Storage
    const timestamp = Date.now();
    const cleanFileName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.]/g, '_'); // Replace special chars with underscore
    
    // Create a unique path with timestamp and user ID
    const filePath = `${userId}/${timestamp}_${cleanFileName}`;
    
    console.log("Attempting to upload file:", filePath);
    
    // Check if bucket exists before uploading
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketError) {
      console.error("Error checking buckets:", bucketError);
      throw new Error('Unable to verify storage bucket');
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'quiz-files');
    if (!bucketExists) {
      console.error("Bucket 'quiz-files' does not exist");
      throw new Error('Storage bucket not found');
    }
    
    // Attempt to upload the file
    const { data, error: uploadError } = await supabase
      .storage
      .from('quiz-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    if (!data) {
      throw new Error('Upload completed but no data was returned');
    }
    
    // Get the public URL
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
    console.error('File upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};
