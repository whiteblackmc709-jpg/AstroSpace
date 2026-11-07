import * as Auth from "./auth.js";
import * as Social from "./social.js";
import * as Audio from "./audio.js";

const $ = (id) => document.getElementById(id);
const show = (id) => { const node = $(id); if (node) node.hidden = false; };
const hide = (id) => { const node = $(id); if (node) node.hidden = true; };

export function mountSocialUI({ toast, getWorld, getRegion, applyGraphics, onSession }) {
  let session = null;
  let authConfigured = false;
  let activeChannel = "global";
  let activeChannelKey = "global/universe";
  let authMode = "signin";
  let volume = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem("astrospace-settings-v2") || "{}");
      return { music: 0.24, ambience: 0.22, sfx: 0.55, ...(stored.volume || {}) };
    } catch { return { music: 0.24, ambience: 0.22, sfx: 0.55 }; }
  })();
  let prefs = (() => {
    try {
      return { quality: "balanced", fov: 58, sensitivity: 1, invert: false,
        reducedMotion: false, adaptiveQuality: true, subtitles: true, hud: true,
        ...JSON.parse(localStorage.getItem("astrospace-settings-v2") || "{}") };
    } catch { return { quality: "balanced", fov: 58, sensitivity: 1, invert: false,
      reducedMotion: false, adaptiveQuality: true, subtitles: true, hud: true }; }
  })();

  const savePrefs = () => localStorage.setItem("astrospace-settings-v2", JSON.stringify({ ...prefs, volume }));
  const setStatus = (message, warning = false) => {
    const node = $("account-status");
    if (!node) return;
    node.textContent = message;
    node.className = "account-status " + (warning ? "warning" : authConfigured ? "online" : "warning");
  };
  const renderSettings = () => {
    $("quality-select").value = prefs.quality;
    $("fov-slider").value = prefs.fov;
    $("sensitivity-slider").value = Math.round(prefs.sensitivity * 100);
    $("invert-look").checked = prefs.invert;
    $("reduced-motion").checked = prefs.reducedMotion;
    $("adaptive-quality").checked = prefs.adaptiveQuality !== false;
    $("subtitles-toggle").checked = prefs.subtitles;
    $("hud-toggle").checked = prefs.hud;
    $("music-volume").value = Math.round(volume.music * 100);
    $("ambience-volume").value = Math.round(volume.ambience * 100);
    $("sfx-volume").value = Math.round(volume.sfx * 100);
    updateLabels();
    applyGraphics?.(prefs);
    Audio.setVolumes(volume);
    document.body.classList.toggle("hud-disabled", !prefs.hud);
  };
  const updateLabels = () => {
    $("fov-value").textContent = prefs.fov + "°";
    $("sensitivity-value").textContent = Math.round(prefs.sensitivity * 100) + "%";
    $("music-value").textContent = Math.round(volume.music * 100) + "%";
    $("ambience-value").textContent = Math.round(volume.ambience * 100) + "%";
    $("sfx-value").textContent = Math.round(volume.sfx * 100) + "%";
  };

  async function updateSession(next) {
    session = next || null;
    if (session) {
      const client = Auth.getSupabase();
      const user = session.user;
      const displayName = String(user.user_metadata?.display_name || user.email?.split("@")[0] || "ASTRO PILOT").slice(0, 24);
      try {
        const { error } = await client.from("profiles").upsert(
          { id: user.id, display_name: displayName, status: "online", updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
        if (error) throw error;
      } catch (error) {
        console.warn("AstroSpace profile sync deferred", error);
      }
      await onSession?.(session);
    }
    const node = $("account-status");
    if (session) {
      setStatus("CONNECTED // " + (session.user.user_metadata?.display_name || session.user.email || "PILOT"));
      $("account-signout").hidden = false;
    } else {
      setStatus(authConfigured ? "ACCOUNT NETWORK READY // SIGN IN OR CREATE A PILOT" :
        "ACCOUNT SERVICE NOT CONFIGURED // LOCAL SAVE ONLY", !authConfigured);
      $("account-signout").hidden = true;
    }
  }

  function renderMessage(message) {
    const list = $("chat-messages");
    const row = document.createElement("article");
    const name = document.createElement("b");
    const body = document.createElement("p");
    const time = document.createElement("time");
    row.className = "chat-message";
    name.textContent = message.sender_name || "PILOT";
    body.textContent = message.content || "";
    time.textContent = new Date(message.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    row.append(name, body, time);
    list.append(row);
    list.scrollTop = list.scrollHeight;
  }

  async function selectChannel(type) {
    activeChannel = type;
    activeChannelKey = type === "global" ? "global/universe" :
      type === "planet" ? "planet/" + getWorld().id : "region/" + getRegion().id;
    document.querySelectorAll("[data-chat-channel]").forEach((button) =>
      button.classList.toggle("active", button.dataset.chatChannel === type));
    $("chat-channel-label").textContent = type === "global" ? "GLOBAL / UNIVERSE" :
      type === "planet" ? getWorld().name + " / PLANET CHAT" : getRegion().name + " / REGION CHAT";
    $("chat-messages").replaceChildren();
    if (!session) {
      $("chat-state").textContent = authConfigured ? "SIGN IN TO CONNECT TO LIVE CHAT." :
        "NETWORK OFFLINE // CONNECT AN ACCOUNT SERVICE TO ENABLE LIVE CHAT.";
      return;
    }
    $("chat-state").textContent = "CONNECTING TO " + $("chat-channel-label").textContent + "…";
    try {
      const messages = await Social.getMessages(activeChannelKey);
      messages.forEach(renderMessage);
      await Social.subscribeMessages(activeChannelKey, (message) => {
        if (activeChannelKey === message.channel_key) renderMessage(message);
      });
      $("chat-state").textContent = "LIVE CHANNEL CONNECTED // BE RESPECTFUL TO OTHER PILOTS";
    } catch (error) {
      $("chat-state").textContent = "CHANNEL UNAVAILABLE // " + error.message;
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = $("chat-input");
    const content = input.value.trim();
    if (!content) return;
    try {
      await Social.sendMessage(activeChannelKey, content);
      input.value = "";
    } catch (error) {
      $("chat-state").textContent = "MESSAGE NOT SENT // " + error.message;
    }
  }

  function socialRow(profile, label, handler, meta = "") {
    const row = document.createElement("div");
    const info = document.createElement("span");
    const name = document.createElement("b");
    const sub = document.createElement("small");
    const action = document.createElement("button");
    row.className = "social-row";
    name.textContent = profile.display_name || "UNKNOWN PILOT";
    sub.textContent = meta || ((profile.status || "PILOT") + " // " + String(profile.id || "").slice(0, 8));
    info.append(name, sub);
    action.textContent = label;
    action.addEventListener("click", handler);
    row.append(info, action);
    return row;
  }

  async function refreshFriends() {
    if (!session) return;
    const friends = $("friend-list");
    const requests = $("friend-request-list");
    friends.replaceChildren();
    requests.replaceChildren();
    try {
      const [friendList, requestList] = await Promise.all([Social.getFriends(), Social.getFriendRequests()]);
      if (!friendList.length) friends.innerHTML = "<div class='social-empty'>YOUR FLIGHT CREW IS EMPTY. FIND PILOTS TO ADD A FRIEND.</div>";
      friendList.forEach((friend) => friends.append(socialRow(friend, "MESSAGE", async () => {
        try {
          const key = await Social.createDirectChannel(friend.id);
          await openDirectMessage(key, friend.display_name);
        } catch (error) { toast("DIRECT CHANNEL FAILED // " + error.message); }
      })));
      $("request-count").textContent = String(requestList.length);
      if (!requestList.length) requests.innerHTML = "<div class='social-empty'>NO PENDING FRIEND REQUESTS.</div>";
      requestList.forEach((request) => {
        const row = socialRow(request.profile || { display_name: "UNKNOWN PILOT", id: request.sender_id }, "ACCEPT", async () => {
          try { await Social.answerFriendRequest(request.id, true); await refreshFriends(); }
          catch (error) { toast("REQUEST FAILED // " + error.message); }
        });
        const decline = document.createElement("button");
        decline.textContent = "DECLINE";
        decline.addEventListener("click", async () => {
          try { await Social.answerFriendRequest(request.id, false); await refreshFriends(); }
          catch (error) { toast("REQUEST FAILED // " + error.message); }
        });
        row.append(decline);
        requests.append(row);
      });
    } catch (error) {
      friends.innerHTML = "<div class='social-empty'>PILOT DIRECTORY UNAVAILABLE // " + error.message + "</div>";
    }
  }

  async function searchPlayers() {
    const q = $("player-search").value.trim();
    const list = $("player-search-results");
    list.replaceChildren();
    if (!session) {
      list.innerHTML = "<div class='social-empty'>SIGN IN TO SEARCH THE PILOT REGISTRY.</div>";
      return;
    }
    if (q.length < 2) {
      list.innerHTML = "<div class='social-empty'>ENTER AT LEAST TWO CHARACTERS.</div>";
      return;
    }
    try {
      const people = await Social.findPlayers(q);
      if (!people.length) list.innerHTML = "<div class='social-empty'>NO PILOTS FOUND FOR THIS CALLSIGN.</div>";
      people.forEach((person) => list.append(socialRow(person, "ADD FRIEND", async () => {
        try { await Social.requestFriend(person.id); toast("FRIEND REQUEST SENT // " + person.display_name); }
        catch (error) { toast("REQUEST FAILED // " + error.message); }
      })));
    } catch (error) {
      list.innerHTML = "<div class='social-empty'>REGISTRY OFFLINE // " + error.message + "</div>";
    }
  }

  async function openDirectMessage(channelKey, callsign) {
    activeChannel = "dm";
    activeChannelKey = channelKey;
    $("community-chat-pane").hidden = false;
    $("community-friends-pane").hidden = true;
    $("community-requests-pane").hidden = true;
    document.querySelectorAll("[data-community-tab]").forEach((button) =>
      button.classList.toggle("active", button.dataset.communityTab === "chat"));
    $("chat-channel-label").textContent = "PRIVATE CHANNEL / " + callsign;
    $("chat-messages").replaceChildren();
    try {
      const messages = await Social.getMessages(channelKey);
      messages.forEach(renderMessage);
      await Social.subscribeMessages(channelKey, renderMessage);
      $("chat-state").textContent = "PRIVATE PILOT CHANNEL // CONNECTED";
    } catch (error) { $("chat-state").textContent = "PRIVATE CHANNEL UNAVAILABLE // " + error.message; }
  }

  function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "signin";
    const signingIn = authMode === "signin";
    $("account-heading").innerHTML = signingIn ? "PILOT <em>IDENTITY.</em>" : "CREATE <em>PILOT ID.</em>";
    $("account-name-field").hidden = signingIn;
    $("account-signin").hidden = !signingIn;
    $("account-signup").hidden = signingIn;
    $("account-forgot").hidden = !signingIn;
    $("account-mode-toggle").textContent = signingIn ? "NEW PILOT? CREATE AN ACCOUNT" : "ALREADY REGISTERED? SIGN IN";
    $("account-password").autocomplete = signingIn ? "current-password" : "new-password";
  }

  async function resetPassword() {
    const email = $("account-email").value.trim();
    if (!email) return setStatus("ENTER YOUR EMAIL ADDRESS FIRST", true);
    try {
      await Auth.resetPassword(email);
      setStatus("PASSWORD RESET LINK SENT // CHECK YOUR EMAIL");
    } catch (error) {
      setStatus("RESET REQUEST FAILED // " + error.message, true);
    }
  }

  async function signIn() {
    const email = $("account-email").value.trim().toLowerCase();
    const password = $("account-password").value;
    if (!email || !password) return setStatus("ENTER EMAIL AND PASSWORD TO CONTINUE", true);
    try {
      const data = await Auth.signIn(email, password);
      await updateSession(data.session);
      toast("PILOT IDENTITY CONNECTED");
      hide("account-overlay");
    } catch (error) { setStatus("SIGN IN FAILED // " + error.message, true); }
  }
  async function signUp() {
    const callsign = $("account-name").value.trim();
    const email = $("account-email").value.trim().toLowerCase();
    const password = $("account-password").value;
    if (!email) return setStatus("ENTER A VALID EMAIL ADDRESS", true);
    if (callsign.length < 2 || callsign.length > 24) return setStatus("CALLSIGN MUST BE 2–24 CHARACTERS", true);
    if (password.length < 8) return setStatus("PASSWORD MUST BE AT LEAST 8 CHARACTERS", true);
    try {
      const data = await Auth.signUp(email, password, callsign);
      if (data.session) {
        await updateSession(data.session);
        toast("PILOT ACCOUNT CREATED");
        hide("account-overlay");
      } else setStatus("CHECK YOUR EMAIL TO CONFIRM YOUR ACCOUNT");
    } catch (error) { setStatus("REGISTRATION FAILED // " + error.message, true); }
  }
  async function signOut() {
    try {
      await Auth.signOut();
      session = null;
      await Social.disconnectSocial();
      await updateSession(null);
      toast("PILOT SIGNED OUT // LOCAL SAVE RETAINED");
    } catch (error) { setStatus("SIGN OUT FAILED // " + error.message, true); }
  }

  function openCommunity() {
    show("community-overlay");
    if (!session) {
      $("chat-state").textContent = authConfigured ? "SIGN IN TO JOIN GLOBAL, PLANET AND REGION CHANNELS." :
        "NETWORK OFFLINE // ACCOUNT SERVICE NOT CONFIGURED.";
      return;
    }
    selectChannel(activeChannel === "dm" ? "global" : activeChannel);
    refreshFriends();
  }

  function switchCommunityTab(tab) {
    document.querySelectorAll("[data-community-tab]").forEach((button) =>
      button.classList.toggle("active", button.dataset.communityTab === tab));
    $("community-chat-pane").hidden = tab !== "chat";
    $("community-friends-pane").hidden = tab !== "friends";
    $("community-requests-pane").hidden = tab !== "requests";
    if (tab !== "chat") refreshFriends();
  }

  function bindEvents() {
    $("account-button").addEventListener("click", () => show("account-overlay"));
    $("account-close").addEventListener("click", () => hide("account-overlay"));
    $("account-signin").addEventListener("click", signIn);
    $("account-mode-toggle").addEventListener("click", () => setAuthMode(authMode === "signin" ? "signup" : "signin"));
    $("account-forgot").addEventListener("click", resetPassword);
    $("account-form").addEventListener("submit", (event) => { event.preventDefault(); authMode === "signin" ? signIn() : signUp(); });
    $("account-signup").addEventListener("click", signUp);
    $("account-signout").addEventListener("click", signOut);
    $("community-button").addEventListener("click", openCommunity);
    $("community-close").addEventListener("click", () => hide("community-overlay"));
    $("chat-form").addEventListener("submit", sendMessage);
    $("player-search-button").addEventListener("click", searchPlayers);
    $("player-search").addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); searchPlayers(); }
    });
    document.querySelectorAll("[data-community-tab]").forEach((button) =>
      button.addEventListener("click", () => switchCommunityTab(button.dataset.communityTab)));
    document.querySelectorAll("[data-chat-channel]").forEach((button) =>
      button.addEventListener("click", () => selectChannel(button.dataset.chatChannel)));
    $("audio-button").addEventListener("click", async () => {
      if (!Audio.isAudioEnabled()) {
        await Audio.startAudio();
      } else {
        Audio.toggleAudio();
      }
      $("audio-button").classList.toggle("selected", Audio.isAudioEnabled());
      toast(Audio.isAudioEnabled() ? "AUDIO ONLINE" : "AUDIO MUTED");
    });
    $("settings-button").addEventListener("click", () => show("settings-overlay"));
    $("settings-close").addEventListener("click", () => hide("settings-overlay"));
    $("settings-reset").addEventListener("click", () => {
      prefs = { quality: "balanced", fov: 58, sensitivity: 1, invert: false,
        reducedMotion: false, adaptiveQuality: true, subtitles: true, hud: true };
      volume = { music: 0.24, ambience: 0.22, sfx: 0.55 };
      renderSettings();
      savePrefs();
    });
    $("quality-select").addEventListener("change", () => { prefs.quality = $("quality-select").value; applyGraphics?.(prefs); savePrefs(); });
    $("adaptive-quality").addEventListener("change", () => { prefs.adaptiveQuality = $("adaptive-quality").checked; applyGraphics?.(prefs); savePrefs(); });
    $("fov-slider").addEventListener("input", () => { prefs.fov = Number($("fov-slider").value); updateLabels(); applyGraphics?.(prefs); savePrefs(); });
    $("sensitivity-slider").addEventListener("input", () => { prefs.sensitivity = Number($("sensitivity-slider").value) / 100; updateLabels(); applyGraphics?.(prefs); savePrefs(); });
    $("invert-look").addEventListener("change", () => { prefs.invert = $("invert-look").checked; applyGraphics?.(prefs); savePrefs(); });
    $("reduced-motion").addEventListener("change", () => { prefs.reducedMotion = $("reduced-motion").checked; applyGraphics?.(prefs); savePrefs(); });
    $("subtitles-toggle").addEventListener("change", () => { prefs.subtitles = $("subtitles-toggle").checked; savePrefs(); });
    $("hud-toggle").addEventListener("change", () => {
      prefs.hud = $("hud-toggle").checked;
      document.body.classList.toggle("hud-disabled", !prefs.hud);
      savePrefs();
    });
    [["music-volume","music"],["ambience-volume","ambience"],["sfx-volume","sfx"]].forEach(([id,key]) =>
      $(id).addEventListener("input", () => {
        volume[key] = Number($(id).value) / 100;
        Audio.setVolumes(volume);
        updateLabels();
        savePrefs();
      }));
    document.addEventListener("keydown", (event) => {
      if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
      if (event.code === "Escape") ["account-overlay","community-overlay","settings-overlay"].forEach(hide);
      if (event.code === "KeyV") $("audio-button").click();
    });
  }

  bindEvents();
  setAuthMode("signin");
  renderSettings();
  Auth.initializeAuth(updateSession).then((result) => {
    authConfigured = Boolean(result.configured);
    if (session) setStatus("CONNECTED // " + (session.user.user_metadata?.display_name || session.user.email || "PILOT"));
    else setStatus(authConfigured ? "ACCOUNT NETWORK READY // SIGN IN OR CREATE A PILOT" :
      "ACCOUNT SERVICE NOT CONFIGURED // LOCAL SAVE ONLY", !authConfigured);
  });
  return {
    refreshContext() {
      if (!session || !showIfCommunityOpen()) return;
      if (activeChannel !== "dm") selectChannel(activeChannel);
    },
    startAudio: () => Audio.startAudio(),
    getSession: () => session,
    getConfigured: () => authConfigured
  };
}

function showIfCommunityOpen() {
  return !$("community-overlay").hidden;
}
