
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
        JSON.stringify({ success: false, error: "Failed to check existing buckets" }),
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
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

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
    // Create a policy to allow public read access
    const { error: policyError } = await supabaseClient.rpc(
      "create_storage_policy",
      { bucket_name: "quiz-files" }
    );

    if (policyError) {
      console.error("Error creating bucket policy:", policyError);
    } else {
      console.log("Bucket policy created successfully");
    }
  } catch (error) {
    console.error("Error creating bucket policy:", error);
  }
}
