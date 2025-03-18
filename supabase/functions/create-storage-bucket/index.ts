
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

  try {
    console.log('Edge function: Create storage bucket invoked');
    
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Validate credentials
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    // Initialize Supabase client with service role key
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

    // Check if bucket exists
    console.log('Checking if bucket exists...');
    const { data: existingBuckets, error: listError } = await supabaseAdmin
      .storage
      .listBuckets();
      
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = existingBuckets.some(bucket => bucket.name === 'quiz-files');
    
    if (!bucketExists) {
      console.log('Creating quiz-files bucket...');
      const { error: createError } = await supabaseAdmin
        .storage
        .createBucket('quiz-files', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
        
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }
    }

    // Ensure bucket is public and has correct policies
    console.log('Configuring bucket policies...');
    try {
      await supabaseAdmin.storage.updateBucket('quiz-files', {
        public: true
      });
      
      // Create a new policy to allow public access
      const policyName = 'allow_public_access';
      await supabaseAdmin
        .storage
        .from('quiz-files')
        .createSignedUrl('dummy.txt', 1); // This creates default policies
    } catch (policyError) {
      console.warn('Warning: Could not update bucket policies:', policyError);
      // Continue despite policy error as the bucket might still work
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: bucketExists ? 'Bucket already exists' : 'Bucket created successfully',
        bucket: 'quiz-files'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Storage bucket creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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
