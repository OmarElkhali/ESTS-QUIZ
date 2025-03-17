
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

serve(async (req) => {
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
      throw new Error(`Error listing buckets: ${listError.message}`)
    }
    
    // Check if the bucket already exists
    const bucketExists = existingBuckets.some(bucket => bucket.name === 'quiz-files')
    
    if (!bucketExists) {
      // Create the bucket
      const { data, error } = await supabaseAdmin
        .storage
        .createBucket('quiz-files', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        })
      
      if (error) {
        throw new Error(`Error creating bucket: ${error.message}`)
      }
      
      console.log('Created quiz-files bucket successfully')
      
      // Set up bucket policies
      const { error: policyError } = await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'quiz-files',
        policy_name: 'Public Access',
        definition: {
          name: 'Public Access',
          allow_upload: true,
          allow_download: true
        }
      })
      
      if (policyError) {
        console.error('Warning: Could not set bucket policies', policyError)
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
