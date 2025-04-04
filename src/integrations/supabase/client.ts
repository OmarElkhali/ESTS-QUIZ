
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://urgqkhmasmedgshizrxb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZ3FraG1hc21lZGdzaGl6cnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMDYxNDYsImV4cCI6MjA1NzY4MjE0Nn0.1hVhyLN-CN4pOPrDLQqPB2DACdz7AH7QzDvHtA7Lo7s";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// More reliable bucket initialization
export const initializeBucket = async (retries = 3): Promise<boolean> => {
  try {
    console.log("Starting bucket initialization...");
    
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error("Error checking buckets:", bucketError);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'quiz-files');
    if (bucketExists) {
      console.log("Bucket 'quiz-files' exists and is ready to use");
      return true;
    }
    
    // Since we can't create buckets directly via the client, try to use a workaround
    // We'll create a fake file to see if the bucket already exists but isn't visible to listBuckets
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const { error: uploadError } = await supabase
      .storage
      .from('quiz-files')
      .upload('test.txt', testFile, { upsert: true });
    
    // If there's no error, the bucket must exist
    if (!uploadError) {
      console.log("Bucket exists and is working properly");
      // Clean up test file
      await supabase.storage.from('quiz-files').remove(['test.txt']);
      return true;
    }
    
    // If we get here, we need to create the bucket via the edge function
    console.log("Calling edge function to create bucket");
    const { data, error } = await supabase.functions.invoke('create-storage-bucket');
    
    if (error) {
      console.error("Failed to invoke edge function:", error);
      
      // Retry logic
      if (retries > 0) {
        console.log(`Retrying bucket initialization (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return initializeBucket(retries - 1);
      }
      
      return false;
    }
    
    if (!data?.success) {
      console.error("Bucket creation was not successful:", data?.error);
      return false;
    }
    
    console.log("Bucket created successfully");
    return true;
  } catch (err) {
    console.error("Bucket initialization error:", err);
    
    // Retry logic
    if (retries > 0) {
      console.log(`Retrying bucket initialization (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initializeBucket(retries - 1);
    }
    
    return false;
  }
};

// Validate client initialization
if (!supabase) {
  console.error("Failed to initialize Supabase client");
} else {
  console.log("Supabase client initialized successfully");
  // Initialize bucket when app starts
  initializeBucket().then(success => {
    console.log("Initial bucket initialization:", success ? "successful" : "failed");
  });
}
