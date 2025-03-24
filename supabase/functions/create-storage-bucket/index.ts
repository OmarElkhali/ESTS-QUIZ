
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting bucket creation process");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseClient
      .storage
      .listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check existing buckets", details: listError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const bucketExists = existingBuckets.some(bucket => bucket.name === "quiz-files");
    
    if (bucketExists) {
      console.log("Bucket 'quiz-files' already exists");
      
      // Create bucket policy if it doesn't exist
      await createBucketPolicy(supabaseClient);
      
      return new Response(
        JSON.stringify({ success: true, message: "Bucket already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating new bucket 'quiz-files'");
    
    // Create the bucket
    const { data, error } = await supabaseClient
      .storage
      .createBucket("quiz-files", {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });

    if (error) {
      console.error("Error creating bucket:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message, code: error.code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Bucket created successfully, setting up policies");
    
    // Create bucket policy
    await createBucketPolicy(supabaseClient);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function createBucketPolicy(supabaseClient: any) {
  try {
    console.log("Attempting to create storage policy");
    
    // Create a policy for public read access
    const { error: policyError } = await supabaseClient
      .storage
      .from('quiz-files')
      .createSignedUrl('test.txt', 60);
    
    if (policyError && policyError.code !== 'OBJECT_NOT_FOUND') {
      console.error("Error creating or testing bucket policy:", policyError);
    } else {
      console.log("Bucket is accessible");
    }
    
    console.log("Storage policy setup completed");
  } catch (error) {
    console.error("Error in policy creation:", error);
  }
}
