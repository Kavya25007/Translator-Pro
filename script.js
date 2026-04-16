const LANGS = [
  ["auto","Auto Detect"],["en","English"],["es","Spanish"],["fr","French"],["de","German"],
  ["hi","Hindi"],["pt","Portuguese"],["ar","Arabic"],["zh","Chinese"],["ja","Japanese"],
  ["ru","Russian"],["it","Italian"],["ko","Korean"],["tr","Turkish"],["nl","Dutch"]
];

const STORAGE_KEY = "neonTranslateStateV4";
let recognition, camStream, debounceTimer, typingTimer;
let state = loadState();
let currentTranslation = "";
let typingPaused = false;

const $ = id => document.getElementById(id);
const els = {
  sidebar:$("sidebar"), pageTitle:$("pageTitle"), sidebarBtns:[...document.querySelectorAll(".nav-link")],
  pages:[...document.querySelectorAll(".page")], menuBtn:$("menuBtn"), collapseBtn:$("collapseBtn"),
  themeBtn:$("themeBtn"), cycleThemeBtn:$("cycleThemeBtn"), toastBtn:$("toastBtn"), assistantBtn:$("assistantBtn"), assistantFab:$("assistantFab"),
  assistantPopup:$("assistantPopup"), closeAssistantBtn:$("closeAssistantBtn"), assistantText:$("assistantText"),
  modalBackdrop:$("modalBackdrop"), modalBox:$("modalBox"), modalText:$("modalText"), closeModalBtn:$("closeModalBtn"),
  toastStack:$("toastStack"), netChip:$("netChip"), speechChip:$("speechChip"), ocrChip:$("ocrChip"), bgChip:$("bgChip"),
  bgVideo:$("bgVideo"), toggleBgBtn:$("toggleBgBtn"), toggleHistoryBtn:$("toggleHistoryBtn"),
  pageButtons:[...document.querySelectorAll("[data-go]")], assistantBtns:[...document.querySelectorAll(".assistant-btn")],
  apiProvider:$("apiProvider"), translatorKey:$("translatorKey"), apiRegion:$("apiRegion"), apiEndpoint:$("apiEndpoint"),
  translateMode:$("translateMode"), voiceSelect:$("voiceSelect"), rateRange:$("rateRange"), pitchRange:$("pitchRange"),
  sourceLang:$("sourceLang"), targetLang:$("targetLang"), swapBtn:$("swapBtn"), detectNowBtn:$("detectNowBtn"),
  inputText:$("inputText"), translatedText:$("translatedText"), typingCursor:$("typingCursor"),
  translateBtn:$("translateBtn"), voiceBtn:$("voiceBtn"), stopVoiceBtn:$("stopVoiceBtn"), imageUpload:$("imageUpload"),
  cameraBtn:$("cameraBtn"), pasteBtn:$("pasteBtn"), clearBtn:$("clearBtn"), urlInput:$("urlInput"), fetchUrlBtn:$("fetchUrlBtn"),
  autoTranslate:$("autoTranslate"), autoSpeak:$("autoSpeak"), liveTyping:$("liveTyping"), ttsBtn:$("ttsBtn"), copyBtn:$("copyBtn"),
  downloadBtn:$("downloadBtn"), favoriteBtn:$("favoriteBtn"), charCount:$("charCount"), wordCount:$("wordCount"),
  readTime:$("readTime"), detectLabel:$("detectLabel"), summaryText:$("summaryText"), translationInfo:$("translationInfo"),
  statusLabel:$("statusLabel"), copyInputBtn:$("copyInputBtn"), historySearch:$("historySearch"), favSearch:$("favSearch"),
  historyList:$("historyList"), favoritesList:$("favoritesList"), exportHistoryBtn:$("exportHistoryBtn"),
  clearHistoryBtn:$("clearHistoryBtn"), reportBtn:$("reportBtn"), compareBtn:$("compareBtn"), comparePanel:$("comparePanel"),
  closeCompareBtn:$("closeCompareBtn"), compareInput:$("compareInput"), compareOutput:$("compareOutput"),
  pauseAnimBtn:$("pauseAnimBtn"), resumeAnimBtn:$("resumeAnimBtn"), cameraStream:$("cameraStream"), captureCanvas:$("captureCanvas")
};

function loadState(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      apiProvider:"custom", translatorKey:"", apiRegion:"", apiEndpoint:"",
      translateMode:"normal", rate:1, pitch:1, favorites:[], history:[], theme:"blue", bgOn:true
    };
  }catch{
    return {apiProvider:"custom", translatorKey:"", apiRegion:"", apiEndpoint:"", translateMode:"normal", rate:1, pitch:1, favorites:[], history:[], theme:"blue", bgOn:true};
  }
}
function saveState(){
  state.apiProvider = els.apiProvider?.value || "custom";
  state.translatorKey = els.translatorKey?.value || "";
  state.apiRegion = els.apiRegion?.value || "";
  state.apiEndpoint = els.apiEndpoint?.value || "";
  state.translateMode = els.translateMode?.value || "normal";
  state.rate = Number(els.rateRange?.value || 1);
  state.pitch = Number(els.pitchRange?.value || 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function debounce(fn, delay=650){ clearTimeout(debounceTimer); debounceTimer = setTimeout(fn, delay); }
function toast(message, type="info"){
  if(!els.toastStack) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  t.style.borderColor = type === "success" ? "rgba(35,213,171,.45)" : type === "danger" ? "rgba(255,86,120,.45)" : "rgba(76,201,240,.35)";
  els.toastStack.appendChild(t);
  setTimeout(()=>{ t.style.opacity = "0"; t.style.transform = "translateX(18px)"; }, 2200);
  setTimeout(()=>t.remove(), 2700);
}
function openModal(title, text){ if(!els.modalBox || !els.modalBackdrop || !els.modalText) return; els.modalText.textContent = text; const h3 = els.modalBox.querySelector("h3"); if(h3) h3.textContent = title; els.modalBackdrop.classList.add("open"); els.modalBox.classList.add("open"); }
function closeModal(){ els.modalBackdrop?.classList.remove("open"); els.modalBox?.classList.remove("open"); }
function setPage(page){ els.pages.forEach(p => p.classList.toggle("active", p.id === `page-${page}`)); els.sidebarBtns.forEach(b => b.classList.toggle("active", b.dataset.page === page)); if(els.pageTitle) els.pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1); if(window.innerWidth <= 900) els.sidebar?.classList.remove("open"); }
function escapeHtml(str){ return (str||"").replace(/[&<>\"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"}[s])); }
function detectLanguage(text){ const t = text.trim(); if(!t) return "—"; if(/[а-я]/i.test(t)) return "Russian"; if(/[अ-ह]/.test(t)) return "Hindi"; if(/[¿¡áéíóúñ]/i.test(t)) return "Spanish"; if(/[äöüß]/i.test(t)) return "German"; if(/[àâçéèêëîïôùûüÿœ]/i.test(t)) return "French"; if(/[한글]/.test(t)) return "Korean"; if(/[漢字かなカナ]/.test(t)) return "East Asian"; return "English-like"; }
function summarize(text){ const words = text.trim().split(/\s+/).filter(Boolean); return words.length ? words.slice(0, Math.min(24, words.length)).join(" ") + (words.length > 24 ? "..." : "") : "Summary will appear here."; }
function metaText(input, output){ return `Source: ${els.sourceLang?.value || "auto"} • Target: ${els.targetLang?.value || "hi"} • Mode: ${els.translateMode?.value || "normal"} • Provider: ${els.apiProvider?.value || "custom"} • Output chars: ${output.length}`; }
function applyMode(text){ return text; }

async function performTranslation(text, from, to){
  const key = els.translatorKey?.value.trim() || "";
  const region = els.apiRegion?.value.trim() || "";
  const endpoint = (els.apiEndpoint?.value.trim() || "https://api.cognitive.microsofttranslator.com").replace(/\/$/, "");
  if(!text.trim()) return "";
  if(!key) return `[${from.toUpperCase()} → ${to.toUpperCase()}] ${text}`;

  const url = `${endpoint}/translate?api-version=3.0&to=${encodeURIComponent(to)}${from !== "auto" ? `&from=${encodeURIComponent(from)}` : ""}`;

  try{
    const res = await fetch(url, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Ocp-Apim-Subscription-Key": key,
        ...(region ? {"Ocp-Apim-Subscription-Region": region} : {})
      },
      body: JSON.stringify([{ Text: text }])
    });

    if(!res.ok){
      const errText = await res.text();
      throw new Error(`Translator error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.[0]?.translations?.[0]?.text || "No translation returned.";
  }catch(err){
    if(els.statusLabel) els.statusLabel.textContent = "Error";
    toast(err.message || "Translation failed", "danger");
    return `[Error] ${text}`;
  }
}

function typeEffect(text){
  clearInterval(typingTimer);
  if(els.translatedText) els.translatedText.textContent = "";
  if(!els.liveTyping?.checked){
    if(els.translatedText) els.translatedText.textContent = text;
    return;
  }
  let i = 0;
  typingPaused = false;
  if(els.typingCursor) els.typingCursor.style.display = "inline-block";
  typingTimer = setInterval(()=>{
    if(typingPaused) return;
    if(els.translatedText) els.translatedText.textContent += text[i] || "";
    i++;
    if(i >= text.length) clearInterval(typingTimer);
  }, 16);
}

function renderVoices(){
  const voices = speechSynthesis?.getVoices?.() || [];
  if(els.voiceSelect) els.voiceSelect.innerHTML = voices.length ? voices.map((v,i)=>`<option value="${i}">${v.name} (${v.lang})</option>`).join("") : `<option value="0">Default voice</option>`;
}
if("speechSynthesis" in window) speechSynthesis.onvoiceschanged = renderVoices;

function updateDirectionLine(){
  const from = els.sourceLang?.options[els.sourceLang.selectedIndex]?.text || "Auto Detect";
  const to = els.targetLang?.options[els.targetLang.selectedIndex]?.text || "Target";
  const el = $("directionLine");
  if(el) el.textContent = `Translating: ${from} → ${to}`;
}

async function translateNow(){
  const input = els.inputText?.value.trim() || "";
  if(!input){
    if(els.translatedText) els.translatedText.textContent="";
    return;
  }

  if(els.statusLabel) els.statusLabel.textContent = "Translating...";
  const detected = els.sourceLang?.value === "auto" ? detectLanguage(input) : (els.sourceLang?.options[els.sourceLang.selectedIndex]?.text || "Unknown");
  if(els.detectLabel) els.detectLabel.textContent = `Detected: ${detected}`;
  if(els.charCount) els.charCount.textContent = `Chars: ${input.length}`;
  if(els.wordCount) els.wordCount.textContent = `Words: ${input.split(/\s+/).filter(Boolean).length}`;
  if(els.readTime) els.readTime.textContent = `Read: ${Math.max(1, Math.ceil(input.split(/\s+/).filter(Boolean).length / 200))}m`;
  if(els.summaryText) els.summaryText.textContent = summarize(input);
  updateDirectionLine();

  const translated = await performTranslation(input, els.sourceLang?.value || "auto", els.targetLang?.value || "hi");
  currentTranslation = translated;
  typeEffect(translated);

  if(els.statusLabel) els.statusLabel.textContent = translated.startsWith("[Error]") ? "Error" : "Done";
  if(els.translationInfo) els.translationInfo.textContent = metaText(input, translated);
  if(els.compareInput) els.compareInput.textContent = input;
  if(els.compareOutput) els.compareOutput.textContent = translated;

  addHistory(input, translated);
  if(els.autoSpeak?.checked) speakText(translated);
  toast(`Translated ${String(els.sourceLang?.value || "auto").toUpperCase()} to ${String(els.targetLang?.value || "hi").toUpperCase()}`, translated.startsWith("[Error]") ? "danger" : "success");
}

function addHistory(input, output){
  state.history.unshift({input, output, source:els.sourceLang?.value || "auto", target:els.targetLang?.value || "hi", mode:els.translateMode?.value || "normal", time:new Date().toLocaleString()});
  state.history = state.history.slice(0, 60);
  saveState();
  renderLists();
}

function addFavorite(text=currentTranslation){
  if(!text) return;
  if(!state.favorites.includes(text)){
    state.favorites.unshift(text);
    state.favorites = state.favorites.slice(0, 60);
    saveState();
    renderLists();
    toast("Saved to favorites", "success");
  }
}

function renderLists(){
  const hs = els.historySearch?.value.trim().toLowerCase() || "";
  const fs = els.favSearch?.value.trim().toLowerCase() || "";
  if(els.historyList) els.historyList.innerHTML = state.history.filter(x=>!hs || `${x.input} ${x.output} ${x.mode}`.toLowerCase().includes(hs)).map(h=>`
    <div class="history-item">
      <strong>${h.source} → ${h.target}</strong> <small>${h.time}</small><br/>
      <small>${h.mode}</small><br/>
      <span>${escapeHtml(h.output)}</span>
    </div>
  `).join("") || "<p>No history yet.</p>";
  if(els.favoritesList) els.favoritesList.innerHTML = state.favorites.filter(x=>!fs || x.toLowerCase().includes(fs)).map(x=>`
    <div class="history-item">${escapeHtml(x)}</div>
  `).join("") || "<p>No favorites yet.</p>";
}

function speakText(text){
  if(!window.speechSynthesis) return toast("Speech synthesis not supported", "danger");
  const voices = speechSynthesis.getVoices();
  const u = new SpeechSynthesisUtterance(text || currentTranslation || els.translatedText?.textContent || "");
  u.rate = Number(els.rateRange?.value || 1);
  u.pitch = Number(els.pitchRange?.value || 1);
  if(voices.length) u.voice = voices[Number(els.voiceSelect?.value || 0)] || voices[0];
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  toast("Speaking output", "info");
}

async function copyText(text){
  await navigator.clipboard.writeText(text || currentTranslation || els.translatedText?.textContent || "");
  toast("Copied to clipboard", "success");
}

function downloadText(content, name, type="text/plain"){
  const blob = new Blob([content], {type});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadReport(){
  const report = {
    generatedAt:new Date().toISOString(),
    settings:{provider:els.apiProvider?.value, region:els.apiRegion?.value, endpoint:els.apiEndpoint?.value, mode:els.translateMode?.value},
    input: els.inputText?.value || "",
    output: currentTranslation,
    language:{source:els.sourceLang?.value, target:els.targetLang?.value, detected:els.detectLabel?.textContent},
    counts:{chars:(els.inputText?.value || "").length, words:(els.inputText?.value || "").trim().split(/\s+/).filter(Boolean).length},
    favorites: state.favorites,
    history: state.history.slice(0, 10)
  };
  downloadText(JSON.stringify(report, null, 2), "translation-report.json", "application/json");
}

function swapLanguages(){
  if(els.sourceLang?.value === "auto") return;
  const a = els.sourceLang.value;
  els.sourceLang.value = els.targetLang.value;
  els.targetLang.value = a;
  updateDirectionLine();
  updateLive();
}

function startVoiceInput(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return toast("Speech recognition not supported", "danger");
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = e => {
    let transcript = "";
    for(let i=e.resultIndex;i<e.results.length;i++) transcript += e.results[i][0].transcript;
    els.inputText.value = transcript.trim();
    updateLive();
  };
  recognition.onend = ()=>{
    if(els.speechChip) els.speechChip.textContent = "Speech Ready";
    toast("Voice input stopped", "info");
  };
  recognition.start();
  if(els.speechChip) els.speechChip.textContent = "Listening...";
  toast("Listening for voice input", "info");
}

function stopVoiceInput(){ recognition?.stop?.(); }

function simulateOCR(text){
  if(els.inputText) els.inputText.value = text;
  updateLive();
  toast("OCR simulated text loaded", "info");
}

async function handleImageFile(file){ if(file) simulateOCR(`OCR simulated from image: ${file.name}.`); }

async function startCamera(){
  try{
    camStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    if(els.cameraStream){
      els.cameraStream.srcObject = camStream;
      els.cameraStream.classList.remove("hidden");
    }
    if(els.ocrChip) els.ocrChip.textContent = "Camera On";
    toast("Camera opened", "success");
    setTimeout(()=>{
      stopCamera();
      simulateOCR("OCR simulated from camera capture.");
    }, 1800);
  }catch{
    toast("Camera access denied or unavailable", "danger");
  }
}

function stopCamera(){
  if(camStream){
    camStream.getTracks().forEach(t=>t.stop());
    camStream = null;
  }
  els.cameraStream?.classList.add("hidden");
  if(els.ocrChip) els.ocrChip.textContent = "OCR Simulated";
}

async function fetchUrlText(){
  const url = els.urlInput?.value.trim() || "";
  if(!url) return;
  try{
    const html = await fetch(url, {mode:"cors"}).then(r=>r.text());
    const doc = new DOMParser().parseFromString(html, "text/html");
    const title = doc.title ? doc.title + "\n\n" : "";
    const text = (title + doc.body.innerText).replace(/\s+/g, " ").trim().slice(0, 6000);
    els.inputText.value = text;
    updateLive();
    toast("URL text imported", "success");
  }catch{
    openModal("CORS Limit", "The browser blocked this request because the target site does not allow cross-origin access.");
  }
}

function updateLive(){
  const text = els.inputText?.value || "";
  if(els.charCount) els.charCount.textContent = `Chars: ${text.length}`;
  if(els.wordCount) els.wordCount.textContent = `Words: ${text.trim().split(/\s+/).filter(Boolean).length}`;
  if(els.readTime) els.readTime.textContent = `Read: ${Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200))}m`;
  if(els.detectLabel) els.detectLabel.textContent = `Detected: ${detectLanguage(text)}`;
  if(els.summaryText) els.summaryText.textContent = summarize(text);
  updateDirectionLine();
  if(els.autoTranslate?.checked) debounce(translateNow, 650);
}

function updateFeatureChips(){
  if(els.netChip) els.netChip.textContent = navigator.onLine ? "Online" : "Offline";
  if(els.speechChip) els.speechChip.textContent = ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) ? "Speech Ready" : "Speech Limited";
}

function updateBgState(){
  if(els.bgChip) els.bgChip.textContent = state.bgOn ? "Background On" : "Background Off";
  if(els.bgVideo) els.bgVideo.style.display = state.bgOn ? "block" : "none";
}

function applyTheme(){
  document.documentElement.style.setProperty("--accent", state.theme === "purple" ? "#9b5cff" : state.theme === "green" ? "#23d5ab" : "#4cc9f0");
}

function openAssistant(){ els.assistantPopup?.classList.add("open"); }
function closeAssistant(){ els.assistantPopup?.classList.remove("open"); }

function bindEvents(){
  els.sidebarBtns.forEach(btn => btn.onclick = () => setPage(btn.dataset.page));
  els.pageButtons.forEach(btn => btn.onclick = () => setPage(btn.dataset.go));
  if(els.menuBtn) els.menuBtn.onclick = () => els.sidebar?.classList.toggle("open");
  if(els.collapseBtn) els.collapseBtn.onclick = () => els.sidebar?.classList.toggle("collapsed");

  const themeHandler = ()=>{
    state.theme = state.theme === "blue" ? "purple" : state.theme === "purple" ? "green" : "blue";
    applyTheme();
    saveState();
    toast("Theme changed", "info");
  };
  if(els.themeBtn) els.themeBtn.onclick = themeHandler;
  if(els.cycleThemeBtn) els.cycleThemeBtn.onclick = themeHandler;

  if(els.toastBtn) els.toastBtn.onclick = ()=>openModal("Navigation Tip", "Use the sidebar to switch pages. The assistant button can help users quickly find features.");
  if(els.assistantBtn) els.assistantBtn.onclick = openAssistant;
  if(els.assistantFab) els.assistantFab.onclick = openAssistant;
  if(els.closeAssistantBtn) els.closeAssistantBtn.onclick = closeAssistant;
  if(els.closeModalBtn) els.closeModalBtn.onclick = closeModal;
  if(els.modalBackdrop) els.modalBackdrop.onclick = closeModal;

  els.assistantBtns.forEach(btn => btn.onclick = () => {
    setPage(btn.dataset.help);
    closeAssistant();
    toast(`Opened ${btn.dataset.help}`, "info");
  });

  if(els.apiProvider) els.apiProvider.onchange = saveState;
  [els.translatorKey, els.apiRegion, els.apiEndpoint, els.translateMode, els.rateRange, els.pitchRange].forEach(el => el && el.addEventListener("input", saveState));

  if(els.sourceLang) els.sourceLang.onchange = ()=>{ updateDirectionLine(); updateLive(); };
  if(els.targetLang) els.targetLang.onchange = ()=>{ updateDirectionLine(); updateLive(); };

  if(els.translateBtn) els.translateBtn.onclick = translateNow;
  if(els.swapBtn) els.swapBtn.onclick = swapLanguages;
  if(els.detectNowBtn) els.detectNowBtn.onclick = ()=>{ if(els.detectLabel) els.detectLabel.textContent = `Detected: ${detectLanguage(els.inputText?.value || "")}`; toast("Language detected", "info"); };

  if(els.voiceBtn) els.voiceBtn.onclick = startVoiceInput;
  if(els.stopVoiceBtn) els.stopVoiceBtn.onclick = stopVoiceInput;
  if(els.imageUpload) els.imageUpload.onchange = e => handleImageFile(e.target.files[0]);
  if(els.cameraBtn) els.cameraBtn.onclick = startCamera;

  if(els.pasteBtn) els.pasteBtn.onclick = async ()=>{ els.inputText.value = await navigator.clipboard.readText(); updateLive(); toast("Pasted from clipboard", "success"); };
  if(els.clearBtn) els.clearBtn.onclick = ()=>{ els.inputText.value = ""; if(els.translatedText) els.translatedText.textContent = ""; currentTranslation = ""; updateLive(); toast("Input cleared", "info"); };
  if(els.fetchUrlBtn) els.fetchUrlBtn.onclick = fetchUrlText;

  if(els.autoTranslate) els.autoTranslate.onchange = updateLive;
  if(els.autoSpeak) els.autoSpeak.onchange = saveState;
  if(els.liveTyping) els.liveTyping.onchange = saveState;

  if(els.ttsBtn) els.ttsBtn.onclick = ()=>speakText();
  if(els.copyBtn) els.copyBtn.onclick = ()=>copyText();
  if(els.copyInputBtn) els.copyInputBtn.onclick = ()=>copyText(els.inputText?.value || "");
  if(els.downloadBtn) els.downloadBtn.onclick = ()=>downloadText(currentTranslation || els.translatedText?.textContent || "", "translated-text.txt");
  if(els.favoriteBtn) els.favoriteBtn.onclick = ()=>addFavorite();
  if(els.reportBtn) els.reportBtn.onclick = downloadReport;

  if(els.compareBtn) els.compareBtn.onclick = ()=>{
    els.comparePanel?.classList.add("open");
    if(els.compareInput) els.compareInput.textContent = els.inputText?.value || "—";
    if(els.compareOutput) els.compareOutput.textContent = currentTranslation || "—";
  };
  if(els.closeCompareBtn) els.closeCompareBtn.onclick = ()=>els.comparePanel?.classList.remove("open");

  if(els.pauseAnimBtn) els.pauseAnimBtn.onclick = ()=>typingPaused = true;
  if(els.resumeAnimBtn) els.resumeAnimBtn.onclick = ()=>typingPaused = false;
  if(els.toggleHistoryBtn) els.toggleHistoryBtn.onclick = ()=>setPage("history");
  if(els.toggleBgBtn) els.toggleBgBtn.onclick = ()=>{ state.bgOn = !state.bgOn; updateBgState(); saveState(); };

  if(els.exportHistoryBtn) els.exportHistoryBtn.onclick = ()=>downloadText(JSON.stringify(state.history, null, 2), "history.json", "application/json");
  if(els.clearHistoryBtn) els.clearHistoryBtn.onclick = ()=>{ state.history = []; saveState(); renderLists(); toast("History cleared", "info"); };

  if(els.historySearch) els.historySearch.oninput = renderLists;
  if(els.favSearch) els.favSearch.oninput = renderLists;

  window.addEventListener("online", updateFeatureChips);
  window.addEventListener("offline", updateFeatureChips);

  document.addEventListener("keydown", e=>{
    if((e.ctrlKey || e.metaKey) && e.key === "Enter") translateNow();
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l"){ e.preventDefault(); els.inputText?.focus(); }
    if(e.key === "Escape"){ closeAssistant(); closeModal(); els.comparePanel?.classList.remove("open"); }
  });

  if(els.inputText) els.inputText.addEventListener("input", updateLive);
}

function init(){
  if(els.sourceLang) els.sourceLang.innerHTML = LANGS.map(([v,t]) => `<option value="${v}">${t}</option>`).join("");
  if(els.targetLang) els.targetLang.innerHTML = LANGS.map(([v,t]) => `<option value="${v}">${t}</option>`).join("");
  if(els.sourceLang) els.sourceLang.value = "auto";
  if(els.targetLang) els.targetLang.value = "hi";

  if(els.apiProvider) els.apiProvider.value = state.apiProvider || "custom";
  if(els.translatorKey) els.translatorKey.value = state.translatorKey || "";
  if(els.apiRegion) els.apiRegion.value = state.apiRegion || "";
  if(els.apiEndpoint) els.apiEndpoint.value = state.apiEndpoint || "";
  if(els.translateMode) els.translateMode.value = state.translateMode || "normal";
  if(els.rateRange) els.rateRange.value = state.rate || 1;
  if(els.pitchRange) els.pitchRange.value = state.pitch || 1;
  if(els.autoTranslate) els.autoTranslate.checked = true;

  renderVoices();
  bindEvents();
  renderLists();
  updateLive();
  applyTheme();
  updateBgState();
  updateFeatureChips();
  setPage("dashboard");
}
init();
