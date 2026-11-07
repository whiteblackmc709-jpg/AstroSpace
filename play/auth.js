const SDK="https://esm.sh/@supabase/supabase-js@2.118.0";
let client=null,session=null,status="loading",initPromise=null,authSub=null;
export async function initializeAuth(onChange=()=>{}){
 if(initPromise)return initPromise;
 initPromise=(async()=>{try{const r=await fetch("/api/auth-config",{cache:"no-store"});if(!r.ok)throw new Error("Account config endpoint unavailable");const c=await r.json();if(!c.configured||!c.url||!c.publishableKey){status="unconfigured";onChange(null);return {configured:false};}
 const {createClient}=await import(SDK);client=createClient(c.url,c.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});
 const current=await client.auth.getSession();session=current.data.session||null;status="ready";await onChange(session);
 const listener=client.auth.onAuthStateChange((_event,next)=>{session=next;queueMicrotask(()=>{Promise.resolve(onChange(session)).catch(error=>console.warn("Auth state callback failed",error));});});authSub=listener.data.subscription;return {configured:true,session};
 }catch(error){status="unconfigured";onChange(null);console.warn("AstroSpace Auth is not configured",error);return {configured:false,error};}})();return initPromise;
}
export const getAuthStatus=()=>status;
export const getSupabase=()=>client;
export const getSession=()=>session;
export async function signIn(email,password){if(!client)throw new Error("ACCOUNT_BACKEND_NOT_CONFIGURED");const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;session=data.session;return data;}
export async function signUp(email,password,displayName){if(!client)throw new Error("ACCOUNT_BACKEND_NOT_CONFIGURED");const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:location.origin+"/play/"}});if(error)throw error;session=data.session;return data;}
export async function signOut(){if(!client)throw new Error("ACCOUNT_BACKEND_NOT_CONFIGURED");const {error}=await client.auth.signOut();if(error)throw error;session=null;}
export async function saveCloudProgress(saveData){if(!client||!session?.user?.id)throw new Error("SIGNED_OUT");const {error}=await client.from("player_saves").upsert({user_id:session.user.id,save_data:saveData,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;}
export async function loadCloudProgress(){if(!client||!session?.user?.id)throw new Error("SIGNED_OUT");const {data,error}=await client.from("player_saves").select("save_data").eq("user_id",session.user.id).maybeSingle();if(error)throw error;return data?.save_data||null;}
