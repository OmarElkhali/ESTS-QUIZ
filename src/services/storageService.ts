
import { supabase } from '@/integrations/supabase/client';

export const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    // Verify bucket exists before uploading
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
    
    // Create a clean filename and unique path
    const timestamp = Date.now();
    const cleanFileName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.]/g, '_'); // Replace special chars with underscore
    
    const filePath = `${userId}/${timestamp}_${cleanFileName}`;
    
    console.log("Uploading file:", filePath);
    
    // Upload the file
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
