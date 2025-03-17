
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

serve(async (req) => {
  console.log('Edge function: Create storage bucket invoked');
  
  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Create the quiz-files bucket if it doesn't exist
    const { data: existingBuckets, error: listError } = await supabaseAdmin
      .storage
      .listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error(`Error listing buckets: ${listError.message}`)
    }
    
    // Check if the bucket already exists
    const bucketExists = existingBuckets.some(bucket => bucket.name === 'quiz-files')
    console.log('Bucket exists:', bucketExists);
    
    if (!bucketExists) {
      // Create the bucket
      console.log('Creating bucket: quiz-files');
      const { data, error } = await supabaseAdmin
        .storage
        .createBucket('quiz-files', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        })
      
      if (error) {
        console.error('Error creating bucket:', error);
        throw new Error(`Error creating bucket: ${error.message}`)
      }
      
      console.log('Created quiz-files bucket successfully');
      
      // Set up bucket policies to allow public access
      try {
        console.log('Setting up bucket policies');
        await supabaseAdmin.storage.from('quiz-files').setPublic(true);
        console.log('Bucket policies set successfully');
      } catch (policyError) {
        console.error('Warning: Could not set bucket policies', policyError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: bucketExists ? 'Bucket already exists' : 'Bucket created successfully'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Storage bucket creation error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
