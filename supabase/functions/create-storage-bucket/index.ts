
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error');
    }

    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, check if the bucket already exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error('Failed to check existing buckets');
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'quiz-files');

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase
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

      console.log('Bucket created successfully');
    }

    // Set bucket to public and update policies
    await supabase.storage.updateBucket('quiz-files', {
      public: true
    });

    // Create policies for the bucket
    const { error: policyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'quiz-files'
    });

    if (policyError) {
      console.warn('Warning: Could not create storage policy:', policyError);
      // Continue despite policy error as the bucket might still work
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: bucketExists ? 'Bucket already exists' : 'Bucket created and configured successfully',
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
    console.error('Error in edge function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
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
