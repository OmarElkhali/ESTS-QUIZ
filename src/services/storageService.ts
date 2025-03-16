
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
// Dans une application réelle, ces valeurs devraient être dans des variables d'environnement
const supabaseUrl = 'https://YOUR_SUPABASE_URL.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_KEY';

// Créer le client Supabase
export const supabaseStorage = createClient(supabaseUrl, supabaseKey);

// Instructions pour configurer Supabase:
// 1. Créez un compte sur https://supabase.com
// 2. Créez un nouveau projet
// 3. Dans les paramètres du projet, trouvez l'URL de l'API et la clé anon
// 4. Remplacez les valeurs ci-dessus par vos propres valeurs
// 5. Dans Supabase, activez Storage et créez un bucket nommé 'quiz-files'
// 6. Configurez les permissions du bucket pour permettre les uploads aux utilisateurs authentifiés

// Exemple de politique pour le bucket 'quiz-files':
/*
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
USING (bucket_id = 'quiz-files');

CREATE POLICY "Allow authenticated downloads" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'quiz-files');
*/
