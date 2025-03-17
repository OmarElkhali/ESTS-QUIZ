
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Edge function: Create storage bucket invoked');
  
  // Create a Supabase client with the service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or service role key');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server configuration error - missing credentials'
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Check if the bucket already exists
    console.log('Checking if bucket exists...');
    const { data: existingBuckets, error: listError } = await supabaseAdmin
      .storage
      .listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error(`Error listing buckets: ${listError.message}`);
    }
    
    const bucketExists = existingBuckets.some(bucket => bucket.name === 'quiz-files');
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
        });
      
      if (error) {
        console.error('Error creating bucket:', error);
        throw new Error(`Error creating bucket: ${error.message}`);
      }
      
      console.log('Created quiz-files bucket successfully');
    }
    
    // Add explicit public access policy for the bucket
    console.log('Setting up bucket policies');
    try {
      // First, try to update bucket to be public
      await supabaseAdmin.storage.updateBucket('quiz-files', {
        public: true
      });
      console.log('Bucket updated to be public');
      
      // Then, try to directly set it public
      await supabaseAdmin.storage.from('quiz-files').setPublic(true);
      console.log('Bucket policies set successfully');
    } catch (policyError) {
      console.error('Warning: Could not set bucket policies', policyError);
      // Continue despite policy error - SQL policies should handle this
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: bucketExists ? 'Bucket already exists' : 'Bucket created successfully'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  } catch (err) {
    console.error('Storage bucket creation error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
});
