import {getSupabase,getSession} from "./auth.js";
let activeChannel=null,activeKey=null,listener=null;
const requireClient=()=>{const c=getSupabase(),u=getSession()?.user;if(!c||!u)throw new Error("SIGN_IN_REQUIRED");return {client:c,user:u};};
export async function findPlayers(query){const {client,user}=requireClient();const term=String(query||"").trim().replace(/[,%()]/g,"");if(term.length<2)return [];const {data,error}=await client.from("profiles").select("id,display_name,avatar_url,status").ilike("display_name","%"+term+"%").neq("id",user.id).limit(12);if(error)throw error;return data||[];}
export async function requestFriend(id){const {client,user}=requireClient();if(id===user.id)throw new Error("YOU_CANNOT_ADD_YOURSELF");const {error}=await client.from("friend_requests").insert({sender_id:user.id,recipient_id:id});if(error)throw error;}
export async function getFriendRequests(){const {client,user}=requireClient();const {data,error}=await client.from("friend_requests").select("id,sender_id,created_at,status").eq("recipient_id",user.id).eq("status","pending").order("created_at",{ascending:false});if(error)throw error;const ids=(data||[]).map(x=>x.sender_id);if(!ids.length)return [];const p=await client.from("profiles").select("id,display_name,avatar_url,status").in("id",ids);if(p.error)throw p.error;const map=new Map(p.data.map(x=>[x.id,x]));return data.map(x=>({...x,profile:map.get(x.sender_id)}));}
export async function answerFriendRequest(requestId,accept){
 const {client,user}=requireClient();
 const {data:request,error}=await client.from("friend_requests").select("sender_id,recipient_id").eq("id",requestId).single();
 if(error)throw error;if(request.recipient_id!==user.id)throw new Error("ONLY_THE_RECIPIENT_CAN_ACCEPT");
 const {error:updateError}=await client.from("friend_requests").update({status:accept?"accepted":"rejected",responded_at:new Date().toISOString()}).eq("id",requestId);
 if(updateError)throw updateError;
 if(accept){const low=request.sender_id<request.recipient_id?request.sender_id:request.recipient_id,high=request.sender_id<request.recipient_id?request.recipient_id:request.sender_id;
  const {error:friendError}=await client.from("friendships").upsert({user_low:low,user_high:high},{onConflict:"user_low,user_high",ignoreDuplicates:true});if(friendError)throw friendError;}
}
export async function getFriends(){const {client,user}=requireClient();const {data,error}=await client.from("friendships").select("user_low,user_high").or("user_low.eq."+user.id+",user_high.eq."+user.id);if(error)throw error;const ids=(data||[]).map(x=>x.user_low===user.id?x.user_high:x.user_low);if(!ids.length)return [];const p=await client.from("profiles").select("id,display_name,avatar_url,status").in("id",ids).order("display_name");if(p.error)throw p.error;return p.data||[];}
export async function removeFriend(friendId){const {client,user}=requireClient();const low=user.id<friendId?user.id:friendId,high=user.id<friendId?friendId:user.id;const {error}=await client.from("friendships").delete().eq("user_low",low).eq("user_high",high);if(error)throw error;}
export async function createDirectChannel(friendId){
 const {client,user}=requireClient();
 const {data:friend,error:friendError}=await client.from("friendships").select("user_low,user_high").or("and(user_low.eq."+user.id+",user_high.eq."+friendId+"),and(user_low.eq."+friendId+",user_high.eq."+user.id+")").limit(1);
 if(friendError)throw friendError;
 const isFriend=(friend||[]).some(f=>(f.user_low===user.id&&f.user_high===friendId)||(f.user_high===user.id&&f.user_low===friendId));
 if(!isFriend)throw new Error("DIRECT_MESSAGES_REQUIRE_FRIENDSHIP");
 const {data:conversation,error}=await client.from("dm_conversations").insert({created_by:user.id}).select("id").single();if(error)throw error;
 const {error:membersError}=await client.from("dm_members").insert([{conversation_id:conversation.id,user_id:user.id},{conversation_id:conversation.id,user_id:friendId}]);if(membersError)throw membersError;
 return "dm/"+conversation.id;
}
export async function getMessages(channelKey,limit=60){const {client}=requireClient();const {data,error}=await client.from("chat_messages").select("id,channel_key,sender_id,content,created_at").eq("channel_key",channelKey).order("created_at",{ascending:true}).limit(limit);if(error)throw error;const messages=data||[];const ids=[...new Set(messages.map(m=>m.sender_id))];if(!ids.length)return [];const p=await client.from("profiles").select("id,display_name").in("id",ids);if(p.error)throw p.error;const map=new Map(p.data.map(x=>[x.id,x.display_name]));return messages.map(m=>({...m,sender_name:map.get(m.sender_id)||"UNKNOWN PILOT"}));}
export async function sendMessage(channelKey,content){const {client,user}=requireClient();const text=String(content||"").trim();if(!text||text.length>1200)throw new Error("MESSAGE_MUST_BE_1_TO_1200_CHARACTERS");const {error}=await client.from("chat_messages").insert({channel_key:channelKey,sender_id:user.id,content:text});if(error)throw error;}
export async function subscribeMessages(channelKey,onMessage){const {client}=requireClient();if(activeChannel){await client.removeChannel(activeChannel);activeChannel=null;}activeKey=channelKey;listener=onMessage;activeChannel=client.channel("astrospace-"+channelKey).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:"channel_key=eq."+channelKey},async payload=>{if(activeKey!==channelKey||!listener)return;try{const p=await client.from("profiles").select("display_name").eq("id",payload.new.sender_id).maybeSingle();listener({...payload.new,sender_name:p.data?.display_name||"UNKNOWN PILOT"});}catch(error){console.warn("Realtime profile lookup failed",error);listener({...payload.new,sender_name:"PILOT"});}}).subscribe();return activeChannel;}
export async function disconnectSocial(){const c=getSupabase();if(c&&activeChannel)await c.removeChannel(activeChannel);activeChannel=null;activeKey=null;listener=null;}
