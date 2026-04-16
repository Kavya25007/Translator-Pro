const LANGS = [
  ["auto","Auto Detect"],["en","English"],["es","Spanish"],["fr","French"],["de","German"],
  ["hi","Hindi"],["pt","Portuguese"],["ar","Arabic"],["zh","Chinese"],["ja","Japanese"],
  ["ru","Russian"],["it","Italian"],["ko","Korean"],["tr","Turkish"],["nl","Dutch"]
];

const STORAGE_KEY = "neonTranslateStateV3";
let recognition, camStream, debounceTimer, typingTimer;
let state = loadState();
let currentTranslation = "";
let typingPaused = false;
let currentPage = "dashboard";

const $ = id => document.getElementById(id);
const els = {
  sidebar:$("sidebar"), pageTitle:$("pageTitle"), sidebarBtns:[...document.querySelectorAll(".nav-link")],
  pages:[...document.querySelectorAll(".page")], menuBtn:$("menuBtn"), collapseBtn:$("collapseBtn"),
  themeBtn:$("themeBtn"), toastBtn:$("toastBtn"), assistantBtn:$("assistantBtn"), assistantFab:$("assistantFab"),
  assistantPopup:$("assistantPopup"), closeAssistantBtn:$("closeAssistantBtn"), assistantText:$("assistantText"),
  modalBackdrop:$("modalBackdrop"), modalBox:$("modalBox"), modalText:$("modalText"), closeModalBtn:$("closeModalBtn"),
  toastStack:$("toastStack"), netChip:$("netChip"), speechChip:$("speechChip"), ocrChip:$("ocrChip"),
  bgChip:$("bgChip"), bgVideo:$("bgVideo"), toggleBgBtn:$("toggleBgBtn"), toggleHistoryBtn:$("toggleHistoryBtn"),
  pageButtons:[...document.querySelectorAll("[data-go]")], assistantBtns:[...document.querySelectorAll(".assistant-btn")],
  apiProvider:$("apiProvider"), apiKey:$("apiKey"), apiRegion:$("apiRegion"), apiEndpoint:$("apiEndpoint"),
  translateMode:$("translateMode"), voiceSelect:$("voiceSelect"), rateRange:$("rateRange"), pitchRange:$("pitchRange"),
  sourceLang:$("sourceLang"), targetLang:$("targetLang"), swapBtn:$("swapBtn"), detectNowBtn:$("detectNowBtn"),
  inputText:$("inputText"), translatedText:$("translatedText"), typingCursor:$("typingCursor"),
  translateBtn:$("translateBtn"), voiceBtn:$("voiceBtn"), stopVoiceBtn:$("stopVoiceBtn"), imageUpload:$("imageUpload"),
  cameraBtn:$("cameraBtn"), pasteBtn:$("pasteBtn"), clearBtn:$("clearBtn"), urlInput:$("urlInput"), fetchUrlBtn:$("fetchUrlBtn"),
  autoTranslate:$("autoTranslate"), autoSpeak:$("autoSpeak"), liveTyping:$("liveTyping"), ttsBtn:$("ttsBtn"), copyBtn:$("copyBtn"),
  downloadBtn:$("downloadBtn"), favoriteBtn:$("favoriteBtn"), charCount:$("charCount"), wordCount:$("wordCount"),
  readTime:$("readTime"), detectLabel:$("detectLabel"), summaryText:$("summaryText"), statusLabel:$("statusLabel"),
  copyInputBtn:$("copyInputBtn"), uppercaseBtn:$("uppercaseBtn"), lowercaseBtn:$("lowercaseBtn"), trimBtn:$("trimBtn"),
  historySearch:$("historySearch"), favSearch:$("favSearch"), historyList:$("historyList"), favoritesList:$("favoritesList"),
  exportHistoryBtn:$("exportHistoryBtn"), clearHistoryBtn:$("clearHistoryBtn"), reportBtn:$("reportBtn"),
  compareBtn:$("compareBtn"), comparePanel:$("comparePanel"), closeCompareBtn:$("closeCompareBtn"), compareInput:$("compareInput"),
  compareOutput:$("compareOutput"), pauseAnimBtn:$("pauseAnimBtn"), resumeAnimBtn:$("resumeAnimBtn"),
  cameraStream:$("cameraStream"), captureCanvas:$("captureCanvas")
};

function loadState(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      apiProvider:"custom", apiKey:"", apiRegion:"", apiEndpoint:"",
      translateMode:"normal", rate:1, pitch:1, favorites:[], history:[], theme:"blue", bgOn:true
    };
  }catch{
    return {apiProvider:"custom", apiKey:"", apiRegion:"", apiEndpoint:"", translateMode:"normal", rate:1, pitch:1, favorites:[], history:[], theme:"blue", bgOn:true};
  }
}
function saveState(){
  state.apiProvider = els.apiProvider.value;
  state.apiKey = els.apiKey.value;
  state.apiRegion = els.apiRegion.value;
  state.apiEndpoint = els.apiEndpoint.value;
  state.translateMode = els.translateMode.value;
  state.rate = Number(els.rateRange.value);
  state.pitch = Number(els.pitchRange.value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function debounce(fn, delay=650){
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, delay);
}
function toast(message, type="info"){
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  t.style.borderColor = type === "success" ? "rgba(35,213,171,.45)" : type === "danger" ? "rgba(255,86,120,.45)" : "rgba(76,201,240,.35)";
  els.toastStack.appendChild(t);
  setTimeout(()=>{ t.style.opacity = "0"; t.style.transform = "translateX(18px)"; }, 2200);
  setTimeout(()=>t.remove(), 2700);
}
function openModal(title, text){
  els.modalText.textContent = text;
  els.modalBox.querySelector("h3").textContent = title;
  els.modalBackdrop.classList.add("open");
  els.modalBox.classList.add("open");
}
function closeModal(){
  els.modalBackdrop.classList.remove("open");
  els.modalBox.classList.remove("open");
}
function setPage(page){
  currentPage = page;
  els.pages.forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  els.sidebarBtns.forEach(b => b.classList.toggle("active", b.dataset.page === page));
  els.pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
  if(window.innerWidth <= 900) els.sidebar.classList.remove("open");
}
function escapeHtml(str){ return (str||"").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s])); }
function detectLanguage(text){
  const t = text.trim();
  if(!t) return "—";
  if(/[а-я]/i.test(t)) return "Russian";
  if(/[अ-ह]/.test(t)) return "Hindi";
  if(/[¿¡áéíóúñ]/i.test(t)) return "Spanish";
  if(/[äöüß]/i.test(t)) return "German";
  if(/[àâçéèêëîïôùûüÿœ]/i.test(t)) return "French";
  if(/[한글]/.test(t)) return "Korean";
  if(/[漢字かなカナ]/.test(t)) return "East Asian";
  return "English-like";
}
function summarize(text){
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, Math.min(24, words.length)).join(" ") + (words.length > 24 ? "..." : "") : "Summary will appear here.";
}
function metaText(input, output){
  return `Mode: ${els.translateMode.value} • Provider: ${els.apiProvider.value} • Source: ${els.sourceLang.value} • Target: ${els.targetLang.value} • Words: ${input.split(/\s+/).filter(Boolean).length} • Output chars: ${output.length}`;
}
function applyMode(text){
  const mode = els.translateMode.value;
  if(mode === "formal") return "Dear user, " + text;
  if(mode === "casual") return "Hey! " + text;
  if(mode === "technical") return "[TECH] " + text;
  if(mode === "simple") return text.replace(/\butilize\b/gi, "use").replace(/\bcommence\b/gi, "start");
  return text;
}
async function performTranslation(text, from, to){
  const endpoint = els.apiEndpoint.value.trim();
  const provider = els.apiProvider.value;
  const payload = {q:text, source:from, target:to, mode:els.translateMode.value, apiKey:els.apiKey.value, region:els.apiRegion.value, provider};
  if(provider !== "mock" && endpoint){
    try{
      const res = await fetch(endpoint, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${els.apiKey.value}`},
        body:JSON.stringify(payload)
      });
      if(res.ok){
        const data = await res.json();
        return data.translatedText || data.translation || data.result || JSON.stringify(data);
      }
    }catch{}
  }
  return applyMode(`[${from.toUpperCase()}→${to.toUpperCase()}] ` + text.split("").reverse().join(""));
}
function typeEffect(text){
  clearInterval(typingTimer);
  els.translatedText.textContent = "";
  if(!els.liveTyping.checked){ els.translatedText.textContent = text; return; }
  let i = 0;
  typingPaused = false;
  els.typingCursor.style.display = "inline-block";
  typingTimer = setInterval(()=>{
    if(typingPaused) return;
    els.translatedText.textContent += text[i] || "";
    i++;
    if(i >= text.length) clearInterval(typingTimer);
  }, 16);
}
function renderVoices(){
  const voices = speechSynthesis?.getVoices?.() || [];
  els.voiceSelect.innerHTML = voices.length ? voices.map((v,i)=>`<option value="${i}">${v.name} (${v.lang})</option>`).join("") : `<option value="0">Default voice</option>`;
}
if("speechSynthesis" in window) speechSynthesis.onvoiceschanged = renderVoices;

async function translateNow(){
  const input = els.inputText.value.trim();
  if(!input){ els.translatedText.textContent=""; return; }
  els.statusLabel.textContent = "Translating...";
  const detected = els.sourceLang.value === "auto" ? detectLanguage(input) : els.sourceLang.options[els.sourceLang.selectedIndex].text;
  els.detectLabel.textContent = `Detected: ${detected}`;
  els.charCount.textContent = `Chars: ${input.length}`;
  els.wordCount.textContent = `Words: ${input.split(/\s+/).filter(Boolean).length}`;
  els.readTime.textContent = `Read: ${Math.max(1, Math.ceil(input.split(/\s+/).filter(Boolean).length / 200))}m`;
  els.summaryText.textContent = summarize(input);
  const translated = await performTranslation(input, els.sourceLang.value, els.targetLang.value);
  currentTranslation = translated;
  typeEffect(translated);
  els.statusLabel.textContent = "Done";
  toast("Translated successfully", "success");
  els.compareInput.textContent = input;
  els.compareOutput.textContent = translated;
  addHistory(input, translated);
  if(els.autoSpeak.checked) speakText(translated);
}
function addHistory(input, output){
  state.history.unshift({input, output, source:els.sourceLang.value, target:els.targetLang.value, mode:els.translateMode.value, time:new Date().toLocaleString()});
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
  const hs = els.historySearch.value.trim().toLowerCase();
  const fs = els.favSearch.value.trim().toLowerCase();
  els.historyList.innerHTML = state.history.filter(x=>!hs || `${x.input} ${x.output} ${x.mode}`.toLowerCase().includes(hs)).map(h=>`
    <div class="history-item">
      <strong>${h.source} → ${h.target}</strong> <small>${h.time}</small><br/>
      <small>${h.mode}</small><br/>
      <span>${escapeHtml(h.output)}</span>
    </div>
  `).join("") || "<p>No history yet.</p>";
  els.favoritesList.innerHTML = state.favorites.filter(x=>!fs || x.toLowerCase().includes(fs)).map(x=>`
    <div class="history-item">${escapeHtml(x)}</div>
  `).join("") || "<p>No favorites yet.</p>";
}
function speakText(text){
  if(!window.speechSynthesis) return toast("Speech synthesis not supported", "danger");
  const voices = speechSynthesis.getVoices();
  const u = new SpeechSynthesisUtterance(text || currentTranslation || els.translatedText.textContent);
  u.rate = Number(els.rateRange.value);
  u.pitch = Number(els.pitchRange.value);
  if(voices.length) u.voice = voices[Number(els.voiceSelect.value)] || voices[0];
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  toast("Speaking output", "info");
}
async function copyText(text){
  await navigator.clipboard.writeText(text || currentTranslation || els.translatedText.textContent || "");
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
    settings:{provider:els.apiProvider.value, region:els.apiRegion.value, endpoint:els.apiEndpoint.value, mode:els.translateMode.value},
    input: els.inputText.value,
    output: currentTranslation,
    language:{source:els.sourceLang.value, target:els.targetLang.value, detected:els.detectLabel.textContent},
    counts:{chars:els.inputText.value.length, words:els.inputText.value.trim().split(/\s+/).filter(Boolean).length},
    favorites: state.favorites,
    history: state.history.slice(0, 10)
  };
  downloadText(JSON.stringify(report, null, 2), "translation-report.json", "application/json");
}
function swapLanguages(){
  if(els.sourceLang.value === "auto") return;
  const a = els.sourceLang.value;
  els.sourceLang.value = els.targetLang.value;
  els.targetLang.value = a;
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
  recognition.onend = ()=>{ els.speechChip.textContent = "Speech Ready"; toast("Voice input stopped", "info"); };
  recognition.start();
  els.speechChip.textContent = "Listening...";
  toast("Listening for voice input", "info");
}
function stopVoiceInput(){ recognition?.stop?.(); }
function simulateOCR(text){ els.inputText.value = text; updateLive(); toast("OCR simulated text loaded", "info"); }
async function handleImageFile(file){ if(file) simulateOCR(`OCR simulated from image: ${file.name}.`); }
async function startCamera(){
  try{
    camStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    els.cameraStream.srcObject = camStream;
    els.cameraStream.classList.remove("hidden");
    els.ocrChip.textContent = "Camera On";
    toast("Camera opened", "success");
    setTimeout(()=>{ stopCamera(); simulateOCR("OCR simulated from camera capture."); }, 1800);
  }catch{
    toast("Camera access denied or unavailable", "danger");
  }
}
function stopCamera(){
  if(camStream){ camStream.getTracks().forEach(t=>t.stop()); camStream = null; }
  els.cameraStream.classList.add("hidden");
  els.ocrChip.textContent = "OCR Simulated";
}
async function fetchUrlText(){
  const url = els.urlInput.value.trim();
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
  const text = els.inputText.value || "";
  els.charCount.textContent = `Chars: ${text.length}`;
  els.wordCount.textContent = `Words: ${text.trim().split(/\s+/).filter(Boolean).length}`;
  els.readTime.textContent = `Read: ${Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200))}m`;
  els.detectLabel.textContent = `Detected: ${detectLanguage(text)}`;
  els.summaryText.textContent = summarize(text);
  if(els.autoTranslate.checked) debounce(translateNow, 650);
}
function updateFeatureChips(){
  els.netChip.textContent = navigator.onLine ? "Online" : "Offline";
  els.speechChip.textContent = ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) ? "Speech Ready" : "Speech Limited";
}
function updateBgState(){
  els.bgChip.textContent = state.bgOn ? "Background On" : "Background Off";
  els.bgVideo.style.display = state.bgOn ? "block" : "none";
}
function applyTheme(){
  document.documentElement.style.setProperty("--accent",
    state.theme === "purple" ? "#9b5cff" : state.theme === "green" ? "#23d5ab" : "#4cc9f0");
}
function syncView(){
  els.compareInput.textContent = els.inputText.value || "—";
  els.compareOutput.textContent = currentTranslation || "—";
}
function openAssistant(){
  els.assistantPopup.classList.add("open");
}
function closeAssistant(){
  els.assistantPopup.classList.remove("open");
}
function bindTilt(){
  const max = 8;
  const card = $("tiltCard");
  card.addEventListener("mousemove", e=>{
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateX(${(-y*max).toFixed(2)}deg) rotateY(${(x*max).toFixed(2)}deg)`;
  });
  card.addEventListener("mouseleave", ()=> card.style.transform = "rotateX(0deg) rotateY(0deg)");
}
function bindEvents(){
  els.sidebarBtns.forEach(btn => btn.onclick = () => setPage(btn.dataset.page));
  els.pageButtons.forEach(btn => btn.onclick = () => setPage(btn.dataset.go));
  els.menuBtn.onclick = () => els.sidebar.classList.toggle("open");
  els.collapseBtn.onclick = () => els.sidebar.classList.toggle("collapsed");
  els.themeBtn.onclick = ()=>{ state.theme = state.theme === "blue" ? "purple" : state.theme === "purple" ? "green" : "blue"; applyTheme(); saveState(); toast("Theme changed", "info"); };
  els.toastBtn.onclick = ()=>openModal("Navigation Tip", "Use the sidebar to switch pages. The assistant button can help users quickly find features.");
  els.assistantBtn.onclick = openAssistant;
  els.assistantFab.onclick = openAssistant;
  els.closeAssistantBtn.onclick = closeAssistant;
  els.closeModalBtn.onclick = closeModal;
  els.modalBackdrop.onclick = closeModal;
  els.assistantBtns.forEach(btn => btn.onclick = () => {
    setPage(btn.dataset.help);
    closeAssistant();
    toast(`Opened ${btn.dataset.help}`, "info");
  });

  els.apiProvider.onchange = saveState;
  [els.apiKey, els.apiRegion, els.apiEndpoint, els.translateMode, els.rateRange, els.pitchRange].forEach(el => el.addEventListener("input", saveState));
  els.sourceLang.onchange = updateLive;
  els.targetLang.onchange = updateLive;

  els.translateBtn.onclick = translateNow;
  els.swapBtn.onclick = swapLanguages;
  els.detectNowBtn.onclick = ()=>{ els.detectLabel.textContent = `Detected: ${detectLanguage(els.inputText.value)}`; toast("Language detected", "info"); };

  els.voiceBtn.onclick = startVoiceInput;
  els.stopVoiceBtn.onclick = stopVoiceInput;
  els.imageUpload.onchange = e => handleImageFile(e.target.files[0]);
  els.cameraBtn.onclick = startCamera;

  els.pasteBtn.onclick = async ()=>{ els.inputText.value = await navigator.clipboard.readText(); updateLive(); toast("Pasted from clipboard", "success"); };
  els.clearBtn.onclick = ()=>{ els.inputText.value = ""; els.translatedText.textContent = ""; currentTranslation = ""; updateLive(); toast("Input cleared", "info"); };
  els.fetchUrlBtn.onclick = fetchUrlText;

  els.autoTranslate.onchange = updateLive;
  els.autoSpeak.onchange = saveState;
  els.liveTyping.onchange = saveState;

  els.ttsBtn.onclick = ()=>speakText();
  els.copyBtn.onclick = ()=>copyText();
  els.copyInputBtn.onclick = ()=>copyText(els.inputText.value);
  els.uppercaseBtn.onclick = ()=>{ els.inputText.value = els.inputText.value.toUpperCase(); updateLive(); };
  els.lowercaseBtn.onclick = ()=>{ els.inputText.value = els.inputText.value.toLowerCase(); updateLive(); };
  els.trimBtn.onclick = ()=>{ els.inputText.value = els.inputText.value.replace(/\s+/g, " ").trim(); updateLive(); };
  els.downloadBtn.onclick = ()=>downloadText(currentTranslation || els.translatedText.textContent, "translated-text.txt");
  els.favoriteBtn.onclick = ()=>addFavorite();
  els.reportBtn.onclick = downloadReport;

  els.compareBtn.onclick = ()=>{ els.comparePanel.classList.add("open"); syncView(); };
  els.closeCompareBtn.onclick = ()=>els.comparePanel.classList.remove("open");

  els.pauseAnimBtn.onclick = ()=>typingPaused = true;
  els.resumeAnimBtn.onclick = ()=>typingPaused = false;

  els.toggleHistoryBtn.onclick = ()=>setPage("history");
  els.exportHistoryBtn.onclick = ()=>downloadText(JSON.stringify(state.history, null, 2), "history.json", "application/json");
  els.clearHistoryBtn.onclick = ()=>{ state.history = []; saveState(); renderLists(); toast("History cleared", "info"); };

  els.historySearch.oninput = renderLists;
  els.favSearch.oninput = renderLists;

  window.addEventListener("online", updateFeatureChips);
  window.addEventListener("offline", updateFeatureChips);

  document.addEventListener("keydown", e=>{
    if((e.ctrlKey || e.metaKey) && e.key === "Enter") translateNow();
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l"){ e.preventDefault(); els.inputText.focus(); }
    if(e.key === "Escape"){ closeAssistant(); closeModal(); els.comparePanel.classList.remove("open"); }
  });

  els.inputText.addEventListener("input", updateLive);
}
function renderLists(){
  const hs = els.historySearch.value.trim().toLowerCase();
  const fs = els.favSearch.value.trim().toLowerCase();
  els.historyList.innerHTML = state.history.filter(x=>!hs || `${x.input} ${x.output} ${x.mode}`.toLowerCase().includes(hs)).map(h=>`
    <div class="history-item">
      <strong>${h.source} → ${h.target}</strong> <small>${h.time}</small><br/>
      <small>${h.mode}</small><br/>
      <span>${escapeHtml(h.output)}</span>
    </div>
  `).join("") || "<p>No history yet.</p>";
  els.favoritesList.innerHTML = state.favorites.filter(x=>!fs || x.toLowerCase().includes(fs)).map(x=>`
    <div class="history-item">${escapeHtml(x)}</div>
  `).join("") || "<p>No favorites yet.</p>";
}
function init(){
  [els.sourceLang, els.targetLang].forEach(sel => sel.innerHTML = LANGS.map(([v,t]) => `<option value="${v}">${t}</option>`).join(""));
  els.sourceLang.value = "auto";
  els.targetLang.value = "en";
  els.apiProvider.value = state.apiProvider || "custom";
  els.apiKey.value = state.apiKey || "";
  els.apiRegion.value = state.apiRegion || "";
  els.apiEndpoint.value = state.apiEndpoint || "";
  els.translateMode.value = state.translateMode || "normal";
  els.rateRange.value = state.rate || 1;
  els.pitchRange.value = state.pitch || 1;
  renderVoices();
  bindEvents();
  bindTilt();
  renderLists();
  updateLive();
  applyTheme();
  updateBgState();
  updateFeatureChips();
  setPage("dashboard");
}
init();
