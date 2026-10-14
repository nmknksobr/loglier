const fileInput = document.getElementById("fileInput");
const tabBar = document.getElementById("tabBar");
const characterPanel = document.getElementById("characterPanel");
const viewpointBar = document.getElementById("viewpointBar");
const viewpointSelect = document.getElementById("viewpointSelect");

let allEntries = [];
let allTabs = [];
let allCharacters = [];
let draggedId = null;
let currentMode = "normal";
let viewpointCharacterId = null;
let imageIdCounter = 0;
let isConfirmed = false;
let activeTabId = null;
let editorTabLayout = "tabs";
let messageColorMode = "name"; // 通常モードの初期色は名前色
let modeTextColors = {normal:"name", serif:"black"}; // モードごとに独立して保持
// 設定値が null の場合は標準のテーマ色をそのまま使用する。
const newAppearancePalette = () => ({pcBubble:null, plBubble:null, logBackground:null});
let appearanceColors = {light:newAppearancePalette(), dark:newAppearancePalette()};
const APPEARANCE_DEFAULTS = {
  light: {pcBubble:"#c9eddd", plBubble:"#f9f8f4", logBackground:"#f0ede6"},
  dark: {pcBubble:"#235747", plBubble:"#30343d", logBackground:"#171b25"},
};
function normalizeAppearanceColors(value) {
  const safe = {light:newAppearancePalette(), dark:newAppearancePalette()};
  for (const theme of ["light","dark"]) {
    for (const key of Object.keys(safe[theme])) {
      const color = value?.[theme]?.[key];
      if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) safe[theme][key]=color.toLowerCase();
    }
  }
  return safe;
}
function applyAppearanceColors() {
  const colors = appearanceColors[currentTheme];
  const vars = ["--pc-bubble-bg", "--pc-bubble-border", "--pl-bubble-bg", "--log-background-custom"];
  vars.forEach(name => document.body.style.removeProperty(name));
  if (colors.pcBubble) {
    document.body.style.setProperty("--pc-bubble-bg",colors.pcBubble);
    document.body.style.setProperty("--pc-bubble-border", "color-mix(in srgb, var(--pc-bubble-bg) 60%, var(--text-color))");
  }
  if (colors.plBubble) document.body.style.setProperty("--pl-bubble-bg",colors.plBubble);
  if (colors.logBackground) document.body.style.setProperty("--log-background-custom",colors.logBackground);
  syncAppearanceInputs();
}
// 自由なカラーピッカーの代わりに、画面の種類とライト／ダークに適した定番色を用意する。
// 旧バージョンで保存した自由色は「以前の色」として保持し、勝手に変更しない。
const APPEARANCE_PRESETS = {
  light: {
    pcBubble: [
      ["水色", "#b7e6f4"], ["標準・ミント", "#c9eddd"], ["桃色", "#ffdce9"], ["薄紫", "#e1d7fa"],
      ["クリーム", "#fff1bb"], ["杏色", "#ffe0c7"], ["青灰", "#d6e2f1"], ["グレー", "#e4e7ec"],
    ],
    plBubble: [
      ["標準・生成り", "#f9f8f4"], ["白", "#ffffff"], ["薄灰", "#eff1f4"], ["砂色", "#f3e8d9"],
      ["薄青", "#e9f2fa"], ["薄紫", "#f1ebf8"], ["薄緑", "#e9f4ec"], ["薄桃", "#fbeee7"],
    ],
    logBackground: [
      ["標準・ベージュ", "#f0ede6"], ["白", "#ffffff"], ["オフ白", "#f7f7f5"], ["薄水色", "#eaf3f7"],
      ["薄緑", "#eff6f1"], ["クリーム", "#f7f0df"], ["薄紫", "#f3eff9"], ["薄灰", "#e7ebf0"],
    ],
  },
  dark: {
    // 彩度を抑えた深い色だけを採用。ライト側のパレットは一切変更しない。
    pcBubble: [
      ["夜青", "#29455f"], ["深海", "#164f60"], ["標準・深緑", "#235747"], ["藍紫", "#453d68"],
      ["葡萄", "#643d55"], ["琥珀", "#624630"], ["苔色", "#4a5435"], ["鉄色", "#414b56"],
    ],
    plBubble: [
      ["標準・濃灰", "#30343d"], ["墨色", "#272c33"], ["青灰", "#303d49"], ["紫灰", "#3b3649"],
      ["栗灰", "#453a36"], ["緑灰", "#30413c"], ["紺灰", "#30394c"], ["石板", "#41444d"],
    ],
    logBackground: [
      ["標準・夜空", "#171b25"], ["漆黒", "#121417"], ["濃紺", "#131b2a"], ["深緑", "#152321"],
      ["濃紫", "#211b2a"], ["焦茶", "#261e1b"], ["青墨", "#1d2730"], ["炭灰", "#272a30"],
    ],
  },
};
const APPEARANCE_PALETTE_FIELDS = [
  ["pcBubble", "pcBubblePalette"], ["plBubble", "plBubblePalette"], ["logBackground", "logBackgroundPalette"],
];
function syncAppearanceInputs() {
  const colors = appearanceColors[currentTheme];
  document.getElementById("appearanceThemeLabel").textContent = (currentTheme === "dark" ? "ダーク" : "ライト") + "モードの色を設定中";
  for (const [key, id] of APPEARANCE_PALETTE_FIELDS) {
    const holder = document.getElementById(id);
    const selectedColor = colors[key] ?? APPEARANCE_DEFAULTS[currentTheme][key];
    const candidates = [...APPEARANCE_PRESETS[currentTheme][key]];
    if (!candidates.some(([, hex]) => hex === selectedColor)) {
      candidates.push(["以前の色", selectedColor]);
    }
    const fragment = document.createDocumentFragment();
    for (const [label, hex] of candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "appearance-palette-choice";
      button.dataset.color = hex;
      button.setAttribute("aria-label", `${label} ${hex}`);
      button.setAttribute("aria-pressed", String(selectedColor === hex));
      button.title = `${label}（${hex}）`;
      const swatch = document.createElement("span");
      swatch.className = "appearance-palette-swatch";
      swatch.style.backgroundColor = hex;
      swatch.setAttribute("aria-hidden", "true");
      const name = document.createElement("span");
      name.className = "appearance-palette-name";
      name.textContent = label;
      button.append(swatch, name);
      fragment.append(button);
    }
    holder.replaceChildren(fragment);
  }
}
for (const [key, id] of APPEARANCE_PALETTE_FIELDS) {
  document.getElementById(id).addEventListener("click", event => {
    const button = event.target.closest("button[data-color]");
    if (!button) return;
    appearanceColors[currentTheme][key] = button.dataset.color;
    applyAppearanceColors();
    saveCurrentStateIfEnabled();
  });
}
document.getElementById("resetAppearanceBtn").addEventListener("click", () => {
  appearanceColors[currentTheme]=newAppearancePalette();
  applyAppearanceColors();
  saveCurrentStateIfEnabled();
});
let hasUserLoadedData = false;
let focusedPaneId = null; // null: 全列編集可能
let initialSkillRulesText = ""; // 技能の初期値は利用者が指定。版を推測しない。
let diceSummaryTimer = null;
let activeWorkspace = "logs";
let showPcSpeech = true;
let showPlSpeech = true;
const showPcSpeechInput = document.getElementById("showPcSpeech");
const showPlSpeechInput = document.getElementById("showPlSpeech");
function syncSpeechVisibilityControls() {
  document.getElementById("serifVisibilityBar").hidden = currentMode !== "serif" || activeWorkspace !== "logs";
  // 色の設定欄は、セリフ風モードのログ画面だけで表示する。
  document.getElementById("appearanceSettings").hidden = currentMode !== "serif" || activeWorkspace !== "logs";
  showPcSpeechInput.checked = showPcSpeech;
  showPlSpeechInput.checked = showPlSpeech;
}
// 選択中のログタブで「」から取り出せている件数を確認できるようにする。
function updateSpeechDetectionStatus() {
  const status = document.getElementById("speechDetectionStatus");
  if (!status) return;
  const visibleTabIds = new Set(allTabs
    .filter(tab => tab.visible && (editorTabLayout === "split" || tab.id === activeTabId))
    .map(tab => tab.id));
  let pc = 0, pl = 0;
  for (const entry of allEntries) {
    if (!visibleTabIds.has(entry.tabId)) continue;
    const character = allCharacters.find(char => char.id === entry.characterId);
    if (character?.type !== "serif") continue;
    for (const part of getSpeechParts(entry)) {
      if (part.kind === "pc") pc++;
      else pl++;
    }
  }
  status.textContent = `判定件数：セリフ ${pc}件／PL発言 ${pl}件` +
    (pc === 0 && visibleTabIds.size ? "（このタブには「」内のセリフがありません）" : "");
}
showPcSpeechInput.addEventListener("change", () => {
  showPcSpeech = showPcSpeechInput.checked;
  renderMessages(); saveCurrentStateIfEnabled();
});
showPlSpeechInput.addEventListener("change", () => {
  showPlSpeech = showPlSpeechInput.checked;
  renderMessages(); saveCurrentStateIfEnabled();
});
const logWorkspace = document.getElementById("logWorkspace");
const diceWorkspace = document.getElementById("diceWorkspace");
const mainContent = document.querySelector(".main-content");
const backToTopBtn = document.getElementById("backToTopBtn");

function setWorkspace(which) {
  activeWorkspace = which;
  document.body.classList.toggle("dice-workspace-active", which === "dice");
  logWorkspace.hidden = which !== "logs";
  diceWorkspace.hidden = which !== "dice";
  for (const [id, value] of [["showLogWorkspaceBtn", "logs"], ["showDiceWorkspaceBtn", "dice"]]) {
    const button = document.getElementById(id);
    button.classList.toggle("active", which === value);
    button.setAttribute("aria-pressed", String(which === value));
  }
  if (which === "dice") renderDiceSummary();
  syncSpeechVisibilityControls();
  mainContent.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
  updateBackToTopVisibility();
}
document.getElementById("showLogWorkspaceBtn").addEventListener("click", () => setWorkspace("logs"));
document.getElementById("showDiceWorkspaceBtn").addEventListener("click", () => setWorkspace("dice"));
// 通常モードで始まるため、初期表示でも色設定欄を隠す。
syncSpeechVisibilityControls();

function updateBackToTopVisibility() {
  backToTopBtn.hidden = (window.scrollY || mainContent.scrollTop) < 260;
}
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
});
window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
mainContent.addEventListener("scroll", updateBackToTopVisibility, { passive: true });

const normalModeBtn = document.getElementById("normalModeBtn");
const serifModeBtn = document.getElementById("serifModeBtn");

normalModeBtn.addEventListener("click", () => {
  currentMode = "normal";
  syncModeTextColor();
  normalModeBtn.classList.add("active");
  serifModeBtn.classList.remove("active");
  viewpointBar.style.display = "none";
  document.body.classList.remove("serif-mode");
  syncSpeechVisibilityControls();
  renderCharacterPanel();
  renderMessages();
});

serifModeBtn.addEventListener("click", () => {
  currentMode = "serif";
  syncModeTextColor();
  serifModeBtn.classList.add("active");
  normalModeBtn.classList.remove("active");
  viewpointBar.style.display = "block";
  document.body.classList.add("serif-mode");
  syncSpeechVisibilityControls();
  renderCharacterPanel();
  renderMessages();
});

viewpointSelect.addEventListener("change", () => {
  viewpointCharacterId = Number(viewpointSelect.value);
  renderMessages();
});

// ココフォリア公式JSON: 編集用JSONとは別のインポーター。外部通信は行わない。
const cocofoliaJsonInput = document.getElementById("cocofoliaJsonInput");
document.getElementById("importCocofoliaJsonBtn").addEventListener("click", () => cocofoliaJsonInput.click());
cocofoliaJsonInput.addEventListener("change", async () => {
  const file = cocofoliaJsonInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 80 * 1024 * 1024) throw new Error("JSONは80MB以下にしてください。");
    const json = JSON.parse(await file.text());
    const result = parseCocofoliaJson(json);
    if (!result.entries.length) throw new Error("読み込める発言がありません。");
    if (allEntries.length && !confirm("現在のログをココフォリアJSONで置き換えますか？")) return;
    hasUserLoadedData = true;
    allEntries = result.entries;
    allTabs = result.tabs;
    allCharacters = result.characters;
    imageIdCounter = result.nextImageId;
    activeTabId = (allTabs.find(t => t.name.toLowerCase() === "main") ?? allTabs[0])?.id ?? null;
    viewpointCharacterId = allCharacters.find(c => c.type === "serif")?.id ?? allCharacters[0]?.id ?? null;
    showPcSpeech = true;
    showPlSpeech = true;
    isConfirmed = false;
    syncSpeechVisibilityControls();
    renderTabBar(); renderCharacterPanel(); renderViewpointSelect(); renderMessages();
    saveCurrentStateIfEnabled();
  } catch (error) { alert("ココフォリアJSONを読み込めませんでした: " + error.message); }
  finally { cocofoliaJsonInput.value = ""; }
});

function stripTrailingSlash(text) {
  // 読み込み時のみ、発言末尾の / を削除。途中のURL・コマンド等は維持。
  return String(text ?? "").replace(/\/+\s*(?=(?:[」』”"]\s*)?$)/g, "").trimEnd();
}

function parseCocofoliaJson(json) {
  if (!json || !Array.isArray(json.messages) || !json.images || typeof json.images !== "object" || Array.isArray(json.images))
    throw new Error("ココフォリアのログJSONの形式ではありません（messages / images が必要です）。");
  const tabsMap = new Map(), charactersMap = new Map();
  const entries = [], characters = [];
  let nextImageId = 0;
  // 画像はBase64 data URI のみ受け入れ、識別子をURLとして外部へ問い合わせない。
  const validImages = new Map(Object.entries(json.images).filter(([id,data]) =>
    typeof id === "string" && typeof data === "string" && /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(data)));
  for (const message of json.messages) {
    if (!message || typeof message !== "object" || typeof message.text !== "string") continue;
    const tabName = String(message.channelName || message.channel || "main").trim() || "main";
    const speaker = String(message.name || "（名前なし）").trim() || "（名前なし）";
    const key = speaker;
    if (!tabsMap.has(tabName)) tabsMap.set(tabName, tabsMap.size);
    if (!charactersMap.has(key)) {
      const color = /^#[0-9a-fA-F]{6}$/.test(message.color) ? message.color : "#888888";
      const id = characters.length;
      const char = { id, originalName:speaker, displayName:speaker, originalColor:color, color,
        type:/^(KP|GM|キーパー)$/i.test(speaker) ? "kp" : (message.iconImage || color.toLowerCase() !== "#888888" ? "serif" : "narration"),
        images:[], imageId:null, imageBySourceId:{} };
      characters.push(char); charactersMap.set(key,char);
    }
    const char = charactersMap.get(key);
    const imageKey = typeof message.iconImage === "string" ? message.iconImage : null;
    if (imageKey && validImages.has(imageKey) && !(imageKey in char.imageBySourceId)) {
      const imageId = nextImageId++;
      char.images.push({id:imageId,data:validImages.get(imageKey)});
      char.imageBySourceId[imageKey] = imageId;
      if (char.imageId === null) char.imageId = imageId;
    }
    const overrideId = imageKey && Object.hasOwn(char.imageBySourceId,imageKey) ? char.imageBySourceId[imageKey] : null;
    const rawRoll = message.extend?.roll;
    const roll = rawRoll && typeof rawRoll === "object" && typeof rawRoll.result === "string"
      ? {result:rawRoll.result, success:rawRoll.success===true, failure:rawRoll.failure===true,
         critical:rawRoll.critical===true, fumble:rawRoll.fumble===true} : null;
    // 公式JSONではコマンドとダイス結果が別フィールドなので、表示文に結果を結合する。
    const text = stripTrailingSlash(message.text.trim()) + (roll ? " " + roll.result.trim() : "");
    const order = entries.length;
    entries.push({id:order,order,tabId:tabsMap.get(tabName),characterId:char.id,
      text,originalText:text,nameOverride:null,colorOverride:null,
      avatarOverrideImageId:overrideId !== char.imageId ? overrideId : null,
      isKp:false, rollMeta:roll ? {...roll, originalText:text} : null});
  }
  for (const char of characters) delete char.imageBySourceId;
  return {entries,tabs:[...tabsMap].map(([name,id])=>({id,name,visible:true})),characters,nextImageId};
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  hasUserLoadedData = true;
  const reader = new FileReader();
  reader.onload = (e) => {
    const htmlText = e.target.result;
    const result = parseLog(htmlText);
    if (!result.entries.length) { alert("ログの発言を読み取れませんでした。元のログはそのまま残します。"); return; }
    allEntries = result.entries;
    allTabs = result.tabs;
    // ココフォリアでは最初に other 等の少数ログが並ぶ場合があるため、
    // main があればそこから表示する（セリフの抽出結果を見つけやすくする）。
    const mainTab = allTabs.find(tab => tab.name.trim().toLowerCase() === "main");
    activeTabId = (mainTab ?? allTabs[0])?.id ?? null;
    allCharacters = result.characters;
    // 新しいHTMLを読み込んだ際は、前回の非表示設定を引き継がない。
    showPcSpeech = true;
    showPlSpeech = true;
    syncSpeechVisibilityControls();

    if (allCharacters.length > 0) {
      viewpointCharacterId = allCharacters[0].id;
    }

    renderTabBar();
    renderCharacterPanel();
    renderViewpointSelect();
    renderMessages();
  };
  reader.readAsText(file, "UTF-8");
});

// HTMLログの本文から、<br> や段落タグによる改行を復元する。
// textContent だけでは <br> が改行として取得されないため、本文要素だけを走査する。
function extractHtmlLogText(element) {
  // Cocofolia HTML separates lines with <br>, not with literal newlines.
  // Ignore indentation that exists only to pretty-print the HTML source.
  const blocks = new Set(["DIV", "P", "SECTION", "ARTICLE", "LI", "BLOCKQUOTE", "PRE"]);
  let result = "";
  const addBlockBreak = () => { if (result && !result.endsWith("\n")) result += "\n"; };
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.nodeValue || "").replace(/\r\n?/g, "\n");
      // Source indentation immediately following a <br> is formatting, not dialogue.
      result += result.endsWith("\n") ? text.replace(/^[ \t]+/, "") : text;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === "BR") { result = result.replace(/[ \t]+$/, "") + "\n"; return; }
    if (tag === "SCRIPT" || tag === "STYLE") return;
    if (blocks.has(tag)) addBlockBreak();
    for (const child of node.childNodes) walk(child);
    if (blocks.has(tag)) addBlockBreak();
  };
  walk(element);
  // Do not collapse internal line breaks (including <br><br> blank lines).
  return result.trim();
}

function parseLog(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  const paragraphs = doc.querySelectorAll("p");

  const entries = [];
  const tabsMap = new Map();
  const charactersMap = new Map();
  let id = 0;
  let tabIdCounter = 0;
  let charIdCounter = 0;

  paragraphs.forEach((p) => {
    const spans = p.querySelectorAll("span");
    if (spans.length < 2) return;

    const rawTag = spans[0].textContent.trim();
    const tabName = rawTag.replace(/^\[|\]$/g, "").trim();
    const speaker = spans[1].textContent.trim();
    const text = stripTrailingSlash(extractHtmlLogText(spans[spans.length - 1]));

    if (!tabsMap.has(tabName)) {
      tabsMap.set(tabName, tabIdCounter++);
    }
    const tabId = tabsMap.get(tabName);

    if (!charactersMap.has(speaker)) {
      charactersMap.set(speaker, charIdCounter++);
    }
    const characterId = charactersMap.get(speaker);

    entries.push({
      id: id,
      order: id,
      tabId,
      characterId,
      text,
      originalText: text,
      nameOverride: null,
      colorOverride: null,
      avatarOverrideImageId: null, // この発言だけアイコンを変える場合に使う
      isKp: false,
    });
    id++;
  });

  const tabs = Array.from(tabsMap.entries()).map(([name, tabId]) => ({
    id: tabId,
    name,
    visible: true,
  }));

  const characters = [];
  charactersMap.forEach((charId, name) => {
    const hex = findMainColorForSpeaker(doc, name);
    characters.push({
      id: charId,
      originalName: name,
      displayName: name,
      originalColor: hex,
      color: hex,
      // KPは会話の吹き出しではなく、従来のKP用表示へ。
      // キャラ設定画面で後から手動変更することも可能。
      type: /^(?:KP|GM|キーパー)$/i.test(name.trim()) ? "kp" : "serif",
      images: [],
      imageId: null,
    });
  });

  return { entries, tabs, characters };
}

// One speaker may change colors between messages. Choose the most frequent
// valid color rather than the first message (which may be an accidental gray).
function findMainColorForSpeaker(doc, speakerName) {
  const counts = new Map();
  for (const p of doc.querySelectorAll("p")) {
    const spans = p.querySelectorAll("span");
    if (spans.length < 2 || spans[1].textContent.trim() !== speakerName) continue;
    const raw = p.style.color;
    if (!raw) continue;
    const color = rgbToHex(raw).toLowerCase();
    counts.set(color, (counts.get(color) || 0) + 1);
  }
  let mainColor = "#000000";
  let maxCount = 0;
  for (const [color, count] of counts) {
    if (count > maxCount) { mainColor = color; maxCount = count; }
  }
  return mainColor;
}

function rgbToHex(color) {
  if (color.startsWith("#")) return color;
  const match = color.match(/\d+/g);
  if (!match) return "#000000";
  const [r, g, b] = match.map(Number);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

document.getElementById("editorTabsMode").addEventListener("click", () => {
  editorTabLayout = "tabs";
  renderMessages();
});
document.getElementById("editorSplitMode").addEventListener("click", () => {
  editorTabLayout = "split";
  renderMessages();
});

function renderTabBar() {
  tabBar.innerHTML = "";
  allTabs.forEach((tab) => {
    const chip = document.createElement("button");
    // 絵文字の目はOSごとに見た目が大きく変わるため、シンプルな記号を使用。
    chip.textContent = tab.visible ? `● ${tab.name}` : `○ ${tab.name}`;
    chip.setAttribute("aria-label", `${tab.name}：${tab.visible ? "表示中" : "非表示"}。タップで切り替え`);
    chip.title = tab.visible ? "表示中（タップで非表示）" : "非表示（タップで表示）";
    chip.className = tab.visible ? "tab-chip visible" : "tab-chip hidden";
    chip.addEventListener("click", () => {
      tab.visible = !tab.visible;
      renderTabBar();
      renderMessages();
    });
    tabBar.appendChild(chip);
  });
}

function renderViewpointSelect() {
  viewpointSelect.innerHTML = "";
  allCharacters.forEach((char) => {
    const option = document.createElement("option");
    option.value = char.id;
    option.textContent = char.displayName;
    if (char.id === viewpointCharacterId) option.selected = true;
    viewpointSelect.appendChild(option);
  });
}

function renderCharacterPanel() {
  characterPanel.innerHTML = "<p class='panel-label'>キャラクターの名前・色</p>";

  allCharacters.forEach((char) => {
    const nameChanged = char.displayName !== char.originalName;
    const colorChanged = char.color !== char.originalColor;
    const currentImage = char.images.find((img) => img.id === char.imageId);

    const card = document.createElement("div");
    card.className = "character-card";

    const imageControlHtml = currentMode === "serif" ? `
      <div class="image-control">
        <label class="avatar-upload-label" style="${currentImage ? `background-image:url(${currentImage.data});` : ""}">
          <input type="file" accept="image/*" class="image-upload-input" data-id="${char.id}" hidden>
          ${currentImage ? "" : "＋"}
        </label>
        <div class="library-thumbs">
          ${char.images.map((img) => `
            <img
              src="${img.data}"
              class="library-thumb ${img.id === char.imageId ? "selected" : ""}"
              data-charid="${char.id}"
              data-imgid="${img.id}"
              title="この画像に切り替える(キャラ全体のデフォルト)"
            >
          `).join("")}
        </div>
      </div>
    ` : "";

    card.innerHTML = `
      ${imageControlHtml}
      <input type="text" class="character-name-input" data-id="${char.id}" value="${char.displayName}">
      ${nameChanged ? `<button class="revert-btn revert-charname-btn" data-id="${char.id}" title="名前を元に戻す">↺</button>` : ""}
      <input type="color" class="color-picker" data-id="${char.id}" value="${char.color}">
      <input type="text" class="color-hex" data-id="${char.id}" value="${char.color}" maxlength="7">
      ${colorChanged ? `<button class="revert-btn revert-color-btn" data-id="${char.id}" title="色を元に戻す">↺</button>` : ""}
      ${currentMode === "serif" ? `
        <select class="type-select" data-id="${char.id}">
          <option value="narration" ${char.type === "narration" ? "selected" : ""}>ナレーション</option>
          <option value="serif" ${char.type === "serif" ? "selected" : ""}>セリフ</option>
          <option value="kp" ${char.type === "kp" ? "selected" : ""}>KP</option>
        </select>
      ` : ""}
    `;
    characterPanel.appendChild(card);
  });

  document.querySelectorAll(".avatar-upload-label").forEach((label) => {
    label.addEventListener("click", (e) => {
      const input = label.querySelector(".image-upload-input");
      if (e.target !== input) {
        e.preventDefault();
        input.click();
      }
    });
  });

  document.querySelectorAll(".image-upload-input").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const char = allCharacters.find((c) => c.id === Number(input.dataset.id));
        const newImage = { id: imageIdCounter++, data: e.target.result };
        char.images.push(newImage);
        char.imageId = newImage.id; // サイドバーからの変更は、キャラ全体のデフォルトを変える

        renderCharacterPanel();
        renderMessages();
      };
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll(".library-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const char = allCharacters.find((c) => c.id === Number(thumb.dataset.charid));
      char.imageId = Number(thumb.dataset.imgid);
      renderCharacterPanel();
      renderMessages();
    });
  });

  document.querySelectorAll(".color-picker").forEach((input) => {
    input.addEventListener("input", () => {
      const char = allCharacters.find((c) => c.id === Number(input.dataset.id));
      char.color = input.value;
      input.parentElement.querySelector(".color-hex").value = input.value;
      renderMessages();
    });
    input.addEventListener("change", () => renderCharacterPanel());
  });

  document.querySelectorAll(".color-hex").forEach((input) => {
    input.addEventListener("input", () => {
      const value = input.value.trim();
      if (!/^#([0-9a-fA-F]{6})$/.test(value)) return;
      const char = allCharacters.find((c) => c.id === Number(input.dataset.id));
      char.color = value;
      input.parentElement.querySelector(".color-picker").value = value;
      renderMessages();
    });
    input.addEventListener("blur", () => renderCharacterPanel());
  });

  document.querySelectorAll(".revert-color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const char = allCharacters.find((c) => c.id === Number(btn.dataset.id));
      char.color = char.originalColor;
      renderCharacterPanel();
      renderMessages();
    });
  });

  document.querySelectorAll(".character-name-input").forEach((input) => {
    input.addEventListener("input", () => {
      const char = allCharacters.find((c) => c.id === Number(input.dataset.id));
      char.displayName = input.value;
      renderMessages();
      renderViewpointSelect();
    });
    input.addEventListener("blur", () => renderCharacterPanel());
  });

  document.querySelectorAll(".revert-charname-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const char = allCharacters.find((c) => c.id === Number(btn.dataset.id));
      char.displayName = char.originalName;
      renderCharacterPanel();
      renderMessages();
      renderViewpointSelect();
    });
  });

  document.querySelectorAll(".type-select").forEach((select) => {
    select.addEventListener("change", () => {
      const char = allCharacters.find((c) => c.id === Number(select.dataset.id));
      char.type = select.value;
      renderMessages();
    });
  });
}

function getVisibleEntriesSorted(tabId = null) {
  const visibleTabIds = tabId !== null ? [tabId] : allTabs.filter((t) => t.visible).map((t) => t.id);
  return allEntries
    .filter((entry) => visibleTabIds.includes(entry.tabId))
    .sort((a, b) => a.order - b.order);
}

function moveEntry(entryId, direction) {
  const movedEntry = allEntries.find(e => e.id === entryId);
  const visibleEntries = getVisibleEntriesSorted(movedEntry?.tabId ?? null);
  const index = visibleEntries.findIndex((e) => e.id === entryId);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= visibleEntries.length) return;

  const temp = visibleEntries[index].order;
  visibleEntries[index].order = visibleEntries[targetIndex].order;
  visibleEntries[targetIndex].order = temp;
  renderMessages();
}

// タブを移動した後は、保存や出力にも新しい順番が反映される。
function reorderLogTab(sourceId, targetId) {
  if (sourceId === targetId) return;
  const from = allTabs.findIndex(t => t.id === sourceId);
  const to = allTabs.findIndex(t => t.id === targetId);
  if (from < 0 || to < 0) return;
  const [moving] = allTabs.splice(from, 1);
  allTabs.splice(to, 0, moving);
  renderTabBar();
  renderMessages();
  saveCurrentStateIfEnabled();
}

function bindReorder(button, tabId) {
  // Pointer Eventsでマウス・タッチの両方をサポート。軽いタップは通常の切替え。
  let origin = null, destination = null;
  const grip = button.querySelector(".tab-reorder-grip");
  grip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    grip.setPointerCapture(event.pointerId);
    origin = {x:event.clientX, y:event.clientY}; destination = null;
  });
  grip.addEventListener("pointermove", event => {
    if (!origin) return;
    if (Math.hypot(event.clientX-origin.x,event.clientY-origin.y) < 9) return;
    button.classList.add("reordering");
    const el = document.elementFromPoint(event.clientX,event.clientY)?.closest(".editor-tab-btn");
    document.querySelectorAll(".editor-tab-btn.drop-target").forEach(x=>x.classList.remove("drop-target"));
    if (el && el !== button) { el.classList.add("drop-target"); destination = Number(el.dataset.tabid); }
    else destination = null;
  });
  const finish = () => {
    if (!origin) return;
    const wasDragging = button.classList.contains("reordering");
    origin = null; button.classList.remove("reordering");
    document.querySelectorAll(".editor-tab-btn.drop-target").forEach(x=>x.classList.remove("drop-target"));
    if (wasDragging) { button.dataset.suppressClick = "true"; setTimeout(()=>delete button.dataset.suppressClick,0); }
    if (wasDragging && destination !== null) reorderLogTab(tabId,destination);
    destination = null;
  };
  grip.addEventListener("pointerup", finish);
  grip.addEventListener("pointercancel", () => {origin=null; destination=null;button.classList.remove("reordering");});
  // デスクトップではHTML5のドラッグ&ドロップも利用できる。
  button.draggable = true;
  button.addEventListener("dragstart", event => {event.dataTransfer.setData("text/plain",String(tabId));event.dataTransfer.effectAllowed="move";});
  button.addEventListener("dragover", event => {event.preventDefault();event.dataTransfer.dropEffect="move";});
  button.addEventListener("drop", event => {event.preventDefault();const id=Number(event.dataTransfer.getData("text/plain"));reorderLogTab(id,tabId);});
}

document.getElementById("selectAllPanesBtn").addEventListener("click", () => {focusedPaneId=null; renderMessages();});

const messageColorSelect = document.getElementById("messageColorMode");
function syncModeTextColor() {
  messageColorMode = modeTextColors[currentMode];
  messageColorSelect.value = messageColorMode;
  document.body.classList.toggle("mode-color-black", messageColorMode === "black");
}
syncModeTextColor();
messageColorSelect.addEventListener("change", () => {
  messageColorMode = messageColorSelect.value;
  modeTextColors[currentMode] = messageColorMode;
  document.body.classList.toggle("mode-color-black", messageColorMode === "black");
  renderMessages();
  saveCurrentStateIfEnabled();
});
function setMessageTextColor(row, displayedColor) {
  // 編集・プレビューとも本文色を統一し、光彩は黒文字モードでだけ有効にする。
  row.style.setProperty("--entry-text-color", messageColorMode === "name"
    ? displayedColor : "var(--message-neutral-color)");
}
function readonlyMessageText(entry, className) {
  const element = document.createElement("div");
  element.className = "preview-message-text " + className;
  element.textContent = entry.text;
  return element.outerHTML;
}
function renderMessages() {
  const host = document.getElementById("logPanels");
  const navigation = document.getElementById("editorTabNavigation");
  const modeTabs = document.getElementById("editorTabsMode");
  const modeSplit = document.getElementById("editorSplitMode");
  const splitBar = document.getElementById("splitSelectionBar");
  syncSpeechVisibilityControls();
  const tabs = allTabs.filter(t => t.visible);
  if (!tabs.some(t => t.id === activeTabId)) activeTabId = tabs[0]?.id ?? null;
  if (!tabs.some(t => t.id === focusedPaneId)) focusedPaneId = null;
  const scrolls = new Map([...host.querySelectorAll(".editor-log-pane")].map(p => [Number(p.dataset.tabid),p.scrollTop]));
  const oldNavScroll = navigation.scrollLeft;
  modeTabs.setAttribute("aria-pressed", String(editorTabLayout === "tabs"));
  modeSplit.setAttribute("aria-pressed", String(editorTabLayout === "split"));
  navigation.replaceChildren();
  tabs.forEach(tab => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "editor-tab-btn";
    button.dataset.tabid = tab.id;
    button.textContent = tab.name;
    const grip = document.createElement("span");
    grip.className = "tab-reorder-grip"; grip.textContent = "⠿"; grip.title = "ここをドラッグして順序変更";
    button.prepend(grip);
    button.title = "タップで表示・⠿をドラッグして並べ替え";
    button.setAttribute("aria-pressed", String(tab.id === activeTabId));
    button.onclick = () => {if(button.dataset.suppressClick) return; activeTabId=tab.id; if(editorTabLayout==="split") focusedPaneId=tab.id; else renderMessages(); if(editorTabLayout==="split") renderMessages();};
    bindReorder(button,tab.id);
    navigation.appendChild(button);
  });
  navigation.scrollLeft = oldNavScroll;
  splitBar.hidden = editorTabLayout !== "split" || tabs.length === 0 || isConfirmed;
  document.getElementById("splitSelectionStatus").textContent = focusedPaneId === null ? "すべての列を編集できます。列を選ぶとその列だけ編集できます。" : `「${tabs.find(t=>t.id===focusedPaneId)?.name ?? ""}」だけ編集中`;
  host.className = "log-panels " + (editorTabLayout === "split" ? "split" : "single");
  host.replaceChildren();
  const selectedTabs = editorTabLayout === "split" ? tabs : tabs.filter(t => t.id === activeTabId);
  // 各タブで全発言を繰り返し走査する代わりに一度だけ振り分ける。
  const entriesByTab = new Map(selectedTabs.map(tab => [tab.id, []]));
  for (const entry of allEntries) {
    const bucket = entriesByTab.get(entry.tabId);
    if (bucket) bucket.push(entry);
  }
  for (const bucket of entriesByTab.values()) bucket.sort((a,b) => a.order-b.order);
  selectedTabs.forEach(tab => {
    const pane = document.createElement("section");
    pane.className = "editor-log-pane";
    pane.dataset.tabid = tab.id;
    pane.setAttribute("aria-label", tab.name);
    const locked = !isConfirmed && editorTabLayout === "split" && focusedPaneId !== null && focusedPaneId !== tab.id;
    if (locked) pane.classList.add("pane-inactive");
    if (!isConfirmed && editorTabLayout === "split" && focusedPaneId === tab.id) pane.classList.add("pane-focused");
    const heading = document.createElement("h2");
    heading.className = "editor-pane-heading";
    const headingTitle = document.createElement("span");
    headingTitle.textContent = tab.name;
    heading.appendChild(headingTitle);
    if (editorTabLayout === "split") {
      const topButton = document.createElement("button");
      topButton.type = "button";
      topButton.className = "pane-top-btn";
      topButton.textContent = "↑ 先頭へ";
      topButton.title = `「${tab.name}」の先頭へ戻る`;
      topButton.addEventListener("click", (event) => {
        event.stopPropagation();
        pane.scrollTo({ top: 0, behavior: "smooth" });
      });
      heading.appendChild(topButton);
    }
    if (!isConfirmed && editorTabLayout === "split") {
      heading.title = "この列だけを編集する";
      heading.addEventListener("click",()=>{focusedPaneId=tab.id;renderMessages();});
    }
    const list = document.createElement("div");
    list.className = "editor-message-list";
    pane.append(heading, list);
    host.appendChild(pane);
    if (currentMode === "normal") renderNormalMessages(list, tab.id, entriesByTab.get(tab.id));
    else renderSerifMessages(list, tab.id, entriesByTab.get(tab.id));
    if (locked) {
      // スクロールは有効のまま、編集操作だけを無効化する。
      list.querySelectorAll("input, textarea, button, select").forEach(el=>{el.disabled=true;});
      list.querySelectorAll("[draggable]").forEach(el=>{el.draggable=false;});
      let pressPoint = null;
      pane.addEventListener("pointerdown", e => { pressPoint={x:e.clientX,y:e.clientY}; }, true);
      pane.addEventListener("pointerup", e => {
        if (!pressPoint || Math.hypot(e.clientX-pressPoint.x,e.clientY-pressPoint.y)>8) return;
        focusedPaneId=tab.id; renderMessages();
      }, true);
    } else if (!isConfirmed && editorTabLayout === "split") {
      pane.addEventListener("pointerdown", () => { /* 全列編集モードは自動では解除しない */ });
    }
    pane.scrollTop = scrolls.get(tab.id) ?? 0;
  });
  if (!isConfirmed) attachCommonListeners();
  updateSpeechDetectionStatus();
  if (activeWorkspace === "dice") renderDiceSummary();
  else document.getElementById("diceTotalBadge").textContent = `${getDiceRollTotal()}件`;
}

// ダイス式と結果が共存するときだけ結果色を適用する（一般の会話を誤判定しない）
// 判定式+出力の両方がある場合だけ分類。ダイス以外の「成功」という語は集計しない。
function parseDiceLine(line) {
  const text = String(line || "").trim();
  const diceExpression = /\b(?:CCB|CC|CBR|RES|SANC|SAN)(?=\b|[<>=≦≤])/i.test(text)
    || /(?:^|[\s(（])\d+D\d+(?:\b|[<>=≦≤+])/i.test(text)
    || /\b\d+[BR]\d+\b/i.test(text);
  // 標準的なココフォリア／BCDiceの「＞ 出目 ＞ 結果」表記も認識。
  const hasRoll = diceExpression || /[＞>]\s*\d+\s*[＞>]/.test(text);
  if (!hasRoll) return null;
  const result = text.split(/[＞>]/).pop().trim();
  let category = null;
  if (/(?:致命的失敗|ファンブル|Fumble)/i.test(result)) category = "fumble";
  else if (/(?:決定的成功|クリティカル|Critical)/i.test(result)) category = "critical";
  else if (/(?:スペシャル|Special)/i.test(result)) category = "special";
  else if (/(?:失敗|Failure)/i.test(result)) category = "failure";
  else if (/(?:ハード成功|イクストリーム成功|成功|Success)/i.test(result)) category = "success";
  // 1D100 (1D100) ＞ 60 等、成否が付かないダイスも分母には含める。
  // 「ダイス式」＋「実際の出目」がそろった行だけを対象にする。
  if (!category && diceExpression && /[＞>]\s*(?:-?\d+|\d+\s*[+＋-]\s*\d+)\s*$/.test(text)) category = "other";
  if (!category) return null;
  const skillMatch = text.match(/【([^】]+)】/);
  const thresholdMatch = text.match(/\b(?:CCB|CC|CBR|RES|SANC|SAN)\s*(?:<=|>=|<|>|≦|≤|=)\s*(\d{1,3})/i)
    || text.match(/\b\d+D100\s*(?:<=|>=|<|>|≦|≤|=)\s*(\d{1,3})/i);
  return {
    category,
    skill: skillMatch ? skillMatch[1].trim() : null,
    threshold: thresholdMatch ? Number(thresholdMatch[1]) : null,
    label: result,
    source: text,
  };
}
function parseDiceRecords(text) {
  return String(text || "").split(/\r?\n/).map(parseDiceLine).filter(Boolean);
}
function parseEntryDiceRecords(entry) {
  const parsed = parseDiceRecords(entry.text);
  const roll = entry.rollMeta;
  if (!roll || roll.originalText !== entry.text) return parsed;
  const category = roll.fumble ? "fumble" : roll.critical ? "critical" :
    roll.failure ? "failure" : roll.success ? "success" : "other";
  if (parsed.length) return parsed.map((record, index) => index === 0 ? {...record,category: (category === "success" && record.category === "special") ? "special" : category} : record);
  const skill = entry.text.match(/【([^】]+)】/)?.[1] ?? null;
  return [{category, skill, threshold:null, label:roll.result, source:entry.text}];
}
function diceOutcome(text) {
  const records = parseDiceRecords(text);
  // 複数行があれば表示上は失敗系を優先（集計上は1行ずつ計算する）。
  if (records.some(r => ["failure", "fumble"].includes(r.category))) return "dice-failure";
  if (records.some(r => ["success", "critical", "special"].includes(r.category))) return "dice-success";
  return "";
}

const DICE_CATEGORY_LABELS = {
  critical: "クリティカル", special: "スペシャル", fumble: "ファンブル",
  success: "通常成功", failure: "通常失敗",
};
function parseInitialSkillRules(text) {
  const rules = new Map();
  const errors = [];
  String(text || "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const found = line.match(/^(.+?)\s*[=＝:：]\s*(\d{1,3})\s*%?$/);
    if (!found || Number(found[2]) > 100) {
      errors.push(index + 1);
      return;
    }
    rules.set(found[1].normalize("NFKC").replace(/\s+/g, "").toLowerCase(), Number(found[2]));
  });
  return { rules, errors };
}

// 発言者とタブの両方で絞り込み。全件の結果から内訳表を作成する。
function getDiceAnalysis(tabScope = "all", speakerScope = "all") {
  const { rules, errors } = parseInitialSkillRules(initialSkillRulesText);
  const speakers = new Map(allCharacters.map(char => [char.id, char.displayName]));
  const records = allEntries.flatMap(entry => {
    const speakerName = String(entry.nameOverride ?? speakers.get(entry.characterId) ?? "不明");
    if (tabScope !== "all" && String(entry.tabId) !== tabScope) return [];
    if (speakerScope !== "all" && speakerName !== speakerScope) return [];
    return parseEntryDiceRecords(entry).map(record => {
      const skillKey = record.skill?.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
      const initialCandidate = !!skillKey && record.threshold !== null && rules.has(skillKey)
        && rules.get(skillKey) === record.threshold
        && ["success", "critical", "special"].includes(record.category);
      return { ...record, entryId: entry.id, tabId: entry.tabId, speakerName, initialCandidate };
    });
  });
  return { records, counts: countDiceRecords(records), errors };
}
function countDiceRecords(records) {
  const counts = { total: records.length, critical: 0, special: 0, fumble: 0, success: 0, failure: 0, other: 0, initial: 0 };
  records.forEach(record => {
    counts[record.category]++;
    if (record.initialCandidate) counts.initial++;
  });
  return counts;
}
// PC・スマホ共通: 人物名/タブ名の直下にクリ・スペ・ファンを横並び表示する。
function buildDiceBreakdown(containerId, records, key) {
  const container = document.getElementById(containerId);
  container.replaceChildren();
  const groups = new Map();
  for (const record of records) {
    const groupKey = key === "tabId" ? String(record.tabId) : record.speakerName;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(record);
  }
  const sorted = [...groups.entries()].sort((a, b) => {
    const countNotable = items => items.filter(r => ["critical", "special", "fumble"].includes(r.category)).length;
    return countNotable(b[1]) - countNotable(a[1]) || a[0].localeCompare(b[0], "ja");
  });
  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "dice-empty";
    empty.textContent = "この条件に一致するダイス判定はありません。";
    container.appendChild(empty);
    return;
  }
  for (const [groupKey, groupRecords] of sorted) {
    const card = document.createElement("article"); card.className = "dice-breakdown-card";
    const heading = document.createElement("button");
    heading.type = "button"; heading.className = "dice-card-heading";
    heading.textContent = key === "tabId"
      ? (allTabs.find(t => String(t.id) === groupKey)?.name ?? "不明なタブ") : groupKey;
    heading.title = "この項目で絞り込む";
    heading.addEventListener("click", () => {
      document.getElementById(key === "tabId" ? "diceSummaryScope" : "diceSpeakerScope").value = groupKey;
      renderDiceSummary();
      diceWorkspace.scrollIntoView({ block: "start" });
    });
    const counts = countDiceRecords(groupRecords);
    const metrics = document.createElement("div"); metrics.className = "dice-card-metrics";
    for (const [category,label] of [["critical","クリ"],["special","スペ"],["fumble","ファン"]]) {
      const item = document.createElement("div"); item.className = `dice-card-stat dice-card-stat-${category}`;
      const caption = document.createElement("span"); caption.textContent = label;
      caption.setAttribute("aria-label", DICE_CATEGORY_LABELS[category]);
      const value = document.createElement("strong"); value.textContent = String(counts[category]);
      item.append(caption,value); metrics.appendChild(item);
    }
    card.append(heading,metrics); container.appendChild(card);
  }
}
function refreshDiceFilterOptions() {
  const scope = document.getElementById("diceSummaryScope");
  const speaker = document.getElementById("diceSpeakerScope");
  const currentTab = scope.value, currentSpeaker = speaker.value;
  scope.replaceChildren(new Option("すべてのタブ", "all"));
  allTabs.forEach(tab => scope.add(new Option(tab.name, String(tab.id))));
  scope.value = [...scope.options].some(opt => opt.value === currentTab) ? currentTab : "all";
  const names = new Set(allEntries.map(entry => String(entry.nameOverride ?? allCharacters.find(c => c.id === entry.characterId)?.displayName ?? "不明")));
  speaker.replaceChildren(new Option("すべての発言者", "all"));
  [...names].sort((a,b)=>a.localeCompare(b,"ja")).forEach(name => speaker.add(new Option(name, name)));
  speaker.value = [...speaker.options].some(opt=>opt.value === currentSpeaker) ? currentSpeaker : "all";
}
function renderDiceSummary() {
  refreshDiceFilterOptions();
  const tabScope = document.getElementById("diceSummaryScope").value;
  const speakerScope = document.getElementById("diceSpeakerScope").value;
  const { records, counts, errors } = getDiceAnalysis(tabScope, speakerScope);
  // 上部バッジはフィルタを解除した総数を表示する。
  document.getElementById("diceTotalBadge").textContent = `${getDiceRollTotal()}件`;
  const metrics = document.getElementById("diceSummaryMetrics");
  metrics.replaceChildren();
  // 割合は「集計できた全ダイスロール」に対する割合。通常成功・失敗も分母に含む。
  const pct = count => ` (${counts.total ? (count / counts.total * 100).toFixed(1) : "0.0"}%)`;
  const totalLine = document.createElement("div");
  totalLine.className = "dice-total-info";
  totalLine.textContent = `解析済みダイス総数：${counts.total}回（割合の分母）`;
  metrics.appendChild(totalLine);
  [
    ["クリティカル", counts.critical, "critical"],
    ["スペシャル", counts.special, "special"],
    ["ファンブル", counts.fumble, "fumble"],
    ["初期値成功候補", counts.initial, "initial"],
  ].forEach(([name, count, category]) => {
    const line = document.createElement("div");
    line.className = `dice-metric dice-metric-${category}`;
    const label = document.createElement("span"); label.textContent = name;
    const value = document.createElement("strong"); value.textContent = String(count) + (category && category !== "initial" ? pct(count) : "");
    line.append(label, value);
    metrics.appendChild(line);
  });
  document.getElementById("initialSkillRuleError").textContent = errors.length ? `形式を確認してください：${errors.join("・")}行目` : "";
  buildDiceBreakdown("diceByTab", records, "tabId");
  const list = document.getElementById("diceSummaryList");
  list.replaceChildren();
  const interesting = records.filter(record => ["critical", "special", "fumble"].includes(record.category) || record.initialCandidate);
  if (!interesting.length) {
    const p = document.createElement("p"); p.className = "dice-empty";
    p.textContent = "該当するクリティカル・スペシャル・ファンブル・初期値成功候補はありません。";
    list.appendChild(p);
    return;
  }
  // 発言者ごとにダイス結果を縦積み。分類の分母はその人物の全解析済みロール数。
  const categories = [["critical", "クリティカル"], ["special", "スペシャル"], ["fumble", "ファンブル"]];
  const speakerRecordsMap = new Map();
  for (const record of records) {
    if (!speakerRecordsMap.has(record.speakerName)) speakerRecordsMap.set(record.speakerName, []);
    speakerRecordsMap.get(record.speakerName).push(record);
  }
  for (const [speakerName, speakerRecords] of [...speakerRecordsMap.entries()].sort((a, b) => a[0].localeCompare(b[0], "ja"))) {
    const speakerCounts = countDiceRecords(speakerRecords);
    const noteworthy = speakerRecords.filter(record => categories.some(([category]) => record.category === category) || record.initialCandidate);
    if (!noteworthy.length) continue;

    const personGroup = document.createElement("section");
    personGroup.className = "dice-person-group";
    const personHeading = document.createElement("h4");
    personHeading.className = "dice-person-heading";
    personHeading.textContent = speakerName;
    personGroup.appendChild(personHeading);

    const appendDiceCategory = (category, label, entries) => {
      const section = document.createElement("section");
      section.className = "dice-category-group";
      const heading = document.createElement("h5");
      heading.className = "dice-category-heading";
      const tag = document.createElement("span");
      tag.className = `dice-result-tag dice-tag-${category}`;
      tag.textContent = label;
      const number = document.createElement("span");
      number.className = "dice-category-count";
      // 通常成功・通常失敗・その他の解析済みダイスも分母に含める。
      const share = speakerCounts.total ? (entries.length / speakerCounts.total * 100).toFixed(1) : "0.0";
      number.textContent = `${entries.length}件 / 総${speakerCounts.total}回（${share}%）`;
      heading.append(tag, number);
      section.appendChild(heading);
      if (entries.length) {
        const items = document.createElement("div");
        items.className = "dice-category-results";
        for (const record of entries) {
          const tab = allTabs.find(t => String(t.id) === String(record.tabId));
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dice-result-item";
          button.title = "クリックすると元の発言に移動します";
          const head = document.createElement("span");
          head.className = "dice-result-head";
          const meta = document.createElement("small");
          meta.textContent = `タブ：${tab?.name ?? "不明なタブ"}`;
          head.appendChild(meta);
          if (record.initialCandidate) {
            const initial = document.createElement("b");
            initial.className = "dice-result-tag dice-tag-initial";
            initial.textContent = "初期値成功候補";
            head.appendChild(initial);
          }
          const snippet = document.createElement("span");
          snippet.className = "dice-result-snippet";
          snippet.textContent = record.source;
          button.append(head, snippet);
          button.addEventListener("click", () => jumpToDiceEntry(record.entryId, record.tabId));
          items.appendChild(button);
        }
        section.appendChild(items);
      } else {
        const empty = document.createElement("p");
        empty.className = "dice-category-empty";
        empty.textContent = "該当なし";
        section.appendChild(empty);
      }
      personGroup.appendChild(section);
    };

    for (const [category, label] of categories) {
      appendDiceCategory(category, label, speakerRecords.filter(record => record.category === category));
    }
    const initialOnly = speakerRecords.filter(record => record.initialCandidate && !categories.some(([category]) => record.category === category));
    if (initialOnly.length) appendDiceCategory("initial", "初期値成功候補", initialOnly);
    list.appendChild(personGroup);
  }
}
function getDiceRollTotal() {
  return allEntries.reduce((sum, entry) => sum + parseEntryDiceRecords(entry).filter(record => ["critical", "special", "fumble"].includes(record.category)).length, 0);
}
function jumpToDiceEntry(entryId, tabId) {
  const tab = allTabs.find(t => t.id === tabId);
  if (!tab) return;
  if (!tab.visible) { tab.visible = true; renderTabBar(); }
  activeTabId = tabId;
  editorTabLayout = "tabs";
  setWorkspace("logs");
  renderMessages();
  const row = [...document.querySelectorAll(".editor-log-pane [data-id]")]
    .find(el => el.dataset.id === String(entryId) && el.classList.contains("message-boundary"));
  if (row) {
    row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    row.classList.add("dice-found-highlight");
    setTimeout(() => row.classList.remove("dice-found-highlight"), 2000);
  }
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    menuToggleBtn.style.display = "";
  }
}
// ダイス集計はメモリ上で実行。サーバー送信はしない。
// 集計結果はタブ区切りでコピー（表計算ソフトにも貼り付け可能）。
function formatDiceCopy() {
  const tabScope = document.getElementById("diceSummaryScope").value;
  const speakerScope = document.getElementById("diceSpeakerScope").value;
  const { records, counts } = getDiceAnalysis(tabScope, speakerScope);
  const selectedTab = allTabs.find(t => String(t.id) === tabScope)?.name ?? "すべて";
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.speakerName)) groups.set(record.speakerName, []);
    groups.get(record.speakerName).push(record);
  }
  const lines = ["ダイス集計", `ログタブ：${selectedTab}`, `解析済みダイス総数：${counts.total}回`, "確率の分母：各人物が振った解析済みダイス総数", ""];
  const pct = (count, total) => `${total ? (count / total * 100).toFixed(1) : "0.0"}%`;
  const kinds = [["critical","クリティカル"],["special","スペシャル"],["fumble","ファンブル"]];
  const orderedGroups = [...groups.entries()].sort((a,b) => a[0].localeCompare(b[0],"ja"));
  if (!orderedGroups.length) lines.push("該当するダイスロールはありません。");
  for (const [speaker, items] of orderedGroups) {
    const c = countDiceRecords(items);
    lines.push(`【${speaker}】`, `ダイス総数：${c.total}回`);
    for (const [category,label] of kinds) lines.push(`${label}：${c[category]}回（${pct(c[category],c.total)}）`);
    lines.push("", "■ 対象のダイス結果");
    // コピー先で結果が連結されないよう、各ダイスを独立した1行に整形する。
    // クリティカル → スペシャル → ファンブルの順に並ぶ。
    for (const [category,label] of kinds) {
      const rolls = items.filter(r => r.category === category);
      for (const roll of rolls) {
        const tabName = allTabs.find(t => t.id === roll.tabId)?.name ?? "不明なタブ";
        // 発言本文内の改行・タブを空白へ揃え、ダイス1件を必ず1行にする。
        const source = String(roll.source).replace(/[\t\r\n]+/g," ").trim();
        lines.push(`${label}：[${tabName}] ${source}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
document.getElementById("copyDiceSummaryBtn").addEventListener("click", async () => {
  const text = formatDiceCopy();
  try {
    if (!navigator.clipboard?.writeText || !window.isSecureContext) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    const button=document.getElementById("copyDiceSummaryBtn");
    button.textContent="コピーしました";
    setTimeout(()=>button.textContent="集計結果をコピー",1500);
  } catch {
    const panel = document.getElementById("copyFallback");
    panel.hidden=false;
    const field=document.getElementById("copyFallbackText");
    field.value=text; field.focus();field.select();
  }
});
document.getElementById("closeCopyFallbackBtn").addEventListener("click",()=>{
  document.getElementById("copyFallback").hidden=true;
});
document.getElementById("diceSummaryScope").addEventListener("change", renderDiceSummary);
document.getElementById("diceSpeakerScope").addEventListener("change", renderDiceSummary);
document.getElementById("diceResetFiltersBtn").addEventListener("click", () => {
  document.getElementById("diceSummaryScope").value = "all";
  document.getElementById("diceSpeakerScope").value = "all";
  renderDiceSummary();
});
const initialSkillRulesInput = document.getElementById("initialSkillRules");
initialSkillRulesInput.addEventListener("input", () => {
  initialSkillRulesText = initialSkillRulesInput.value;
  scheduleDiceSummary();
  saveCurrentStateIfEnabled();
});
function scheduleDiceSummary() {
  clearTimeout(diceSummaryTimer);
  if (activeWorkspace === "dice") diceSummaryTimer = setTimeout(renderDiceSummary, 180);
}

function editableMessageText(entry, className, extraStyle = "") {
  return `<textarea class="text-input ${className}" data-id="${entry.id}" ${extraStyle}>${escapeHtml(entry.text)}</textarea>`;
}

// アイコンの有無はデータで判定する。HTMLログなど画像がない発言には余白を設けない。
function normalEntryAvatar(entry, character) {
  if (!character || !Array.isArray(character.images)) return "";
  const override = entry.avatarOverrideImageId !== null
    ? character.images.find(img => img.id === entry.avatarOverrideImageId) : null;
  const image = override || character.images.find(img => img.id === character.imageId);
  if (!image || typeof image.data !== "string" || !image.data.startsWith("data:image/")) return "";
  return `<img class="normal-entry-avatar" src="${escapeHtml(image.data)}" alt="" loading="lazy" decoding="async">`;
}

function renderNormalMessages(container, tabId, sortedEntries = null) {
  const characterById = new Map(allCharacters.map(c => [c.id, c]));
  const visibleEntries = sortedEntries ?? getVisibleEntriesSorted(tabId);

  visibleEntries.forEach((entry) => {
    const character = characterById.get(entry.characterId);
    const row = document.createElement("div");
    row.className = "message-row message-boundary " + diceOutcome(entry.text);
    row.dataset.id = entry.id;
    const avatarHtml = normalEntryAvatar(entry, character);
    if (avatarHtml) row.classList.add("has-normal-avatar");

    const displayedName = entry.nameOverride !== null ? entry.nameOverride : character.displayName;
    const displayedColor = entry.colorOverride !== null ? entry.colorOverride : character.color;

    setMessageTextColor(row, displayedColor);
    if (isConfirmed) {
      row.innerHTML = `
        ${avatarHtml}
        <div class="speaker-label" style="color:${escapeHtml(displayedColor)}">${escapeHtml(displayedName)}</div>
        ${readonlyMessageText(entry, "normal-inline-text")}
      `;
      container.appendChild(row);
      return;
    }

    row.draggable = true;
    const textChanged = entry.text !== entry.originalText;
    const speakerColorStyle = entry.isKp ? "" : `style="color: ${displayedColor}"`;

    row.innerHTML = `
    ${avatarHtml}
    <div class="row-top">
      <div class="name-area">
        ${!entry.isKp ? `
          <input type="color" class="entry-color-picker" data-id="${entry.id}" value="${displayedColor}" title="この発言だけの色">
          ${entry.colorOverride !== null ? `<button class="revert-btn revert-entrycolor-btn" data-id="${entry.id}" title="この発言だけ色を元に戻す">↺</button>` : ""}
        ` : ""}
        <input class="speaker-input ${entry.isKp ? "kp-name" : ""}" data-id="${entry.id}" ${speakerColorStyle} value="${displayedName}">
        ${entry.nameOverride !== null ? `<button class="revert-btn revert-name-btn" data-id="${entry.id}" title="この発言だけ名前を元に戻す">↺</button>` : ""}
      </div>
        <div class="move-buttons">
          <span class="drag-handle">⠿</span>
          <button class="move-btn" data-id="${entry.id}" data-dir="-1">▲</button>
          <button class="move-btn" data-id="${entry.id}" data-dir="1">▼</button>
          <button type="button" class="delete-entry-btn" data-id="${entry.id}" aria-label="この発言を削除" title="この発言を削除">削除</button>
        </div>
      </div>
      <div class="text-area">
        ${editableMessageText(entry, "normal-inline-text")}
        ${textChanged ? `<button class="revert-btn revert-text-btn" data-id="${entry.id}" title="本文を元に戻す">↺</button>` : ""}
      </div>
    `;

    attachDragEvents(row, entry);
    container.appendChild(row);
  });

}

// かぎかっこのペアだけをPCセリフと解釈する。
// 引用符は保存データから除去せず、表示時だけ分割する。閉じ忘れはPL側に残す。
function splitSpeechParts(value) {
  const source = String(value ?? "");
  const result = [];
  let cursor = 0, i = 0;
  while (i < source.length) {
    if (source[i] !== "「") { i++; continue; }
    const opening = i;
    let depth = 1, closing = i + 1;
    while (closing < source.length && depth > 0) {
      if (source[closing] === "「") depth++;
      else if (source[closing] === "」") depth--;
      if (depth) closing++;
    }
    if (depth !== 0) break; // ペアがなければ原文のままPL側へ
    if (opening > cursor) result.push({ kind:"pl", start:cursor, end:opening, text:source.slice(cursor, opening) });
    result.push({ kind:"pc", start:opening + 1, end:closing, text:source.slice(opening + 1, closing) });
    cursor = closing + 1;
    i = cursor;
  }
  if (cursor < source.length) result.push({ kind:"pl", start:cursor, end:source.length, text:source.slice(cursor) });
  // 空白だけのPLを隠すが、空の「」は編集できるよう残す。
  return result.filter(part => part.kind === "pc" || part.text.trim());
}
function getSpeechParts(entry) {
  // KP・ナレーションは従来どおり。ダイス結果もPLとして一体表示。
  if (parseDiceRecords(entry.text).length) return [{kind:"pl", start:0, end:entry.text.length, text:entry.text}];
  return splitSpeechParts(entry.text);
}
function segmentedMessageTextarea(entry, part, className, background) {
  return `<textarea class="text-input ${className} segmented-text" data-id="${entry.id}" data-start="${part.start}" data-end="${part.end}" ${background ? `style="background:${background}"` : ""}>${escapeHtml(part.text)}</textarea>`;
}
function segmentedPreviewText(part, className) {
  return `<div class="preview-message-text ${className}">${escapeHtml(part.text)}</div>`;
}
function renderSerifMessages(container, tabId, sortedEntries = null) {
  const characterById = new Map(allCharacters.map(c => [c.id, c]));
  const visibleEntries = sortedEntries ?? getVisibleEntriesSorted(tabId);

  visibleEntries.forEach((entry) => {
    const character = characterById.get(entry.characterId);
    const displayedName = entry.nameOverride !== null ? entry.nameOverride : character.displayName;
    const displayedColor = entry.colorOverride !== null ? entry.colorOverride : character.color;

    // この発言だけのアイコン上書きがあれば優先、なければキャラの標準アイコン
    const overrideImage = entry.avatarOverrideImageId !== null
      ? character.images.find((img) => img.id === entry.avatarOverrideImageId)
      : null;
    const image = overrideImage || character.images.find((img) => img.id === character.imageId);

    const row = document.createElement("div");
    row.dataset.id = entry.id;
    setMessageTextColor(row, displayedColor);
    // 各分岐の className で境界線・ダイス結果のクラスを設定する。
    // diceOutcome() が空文字を返す場合もあるため classList.add() には渡さない。

    if (character.type === "narration") {
      row.className = "serif-row narration-row message-boundary " + diceOutcome(entry.text);
      row.innerHTML = isConfirmed
        ? readonlyMessageText(entry, "narration-text")
        : `<textarea class="text-input narration-text" data-id="${entry.id}">${escapeHtml(entry.text)}</textarea>`;
    } else if (character.type === "kp") {
      row.className = "serif-row kp-row message-boundary " + diceOutcome(entry.text);
      row.innerHTML = isConfirmed
        ? readonlyMessageText(entry, "kp-text")
        : `<textarea class="text-input kp-text" data-id="${entry.id}">${escapeHtml(entry.text)}</textarea>`;
    } else {
      const isSelf = character.id === viewpointCharacterId;
      row.className = "serif-row bubble-row message-boundary " + diceOutcome(entry.text) + (isSelf ? " bubble-right" : " bubble-left");

      const avatarStyle = image ? `background-image:url(${image.data}); background-size:cover;` : "";
      const hasOverride = entry.avatarOverrideImageId !== null;

      const makeAvatar = () => isConfirmed
        ? `<div class="avatar-placeholder" style="${avatarStyle}"></div>`
        : `<div class="avatar-wrapper">
             <label class="avatar-placeholder avatar-clickable" style="${avatarStyle}">
               <input type="file" accept="image/*" class="image-upload-input-inline" data-id="${entry.id}" data-charid="${character.id}" hidden>
               ${image ? "" : "<span class='avatar-plus'>＋</span>"}
             </label>
             ${hasOverride ? `<button class="revert-btn revert-avatar-btn" data-id="${entry.id}" title="このアイコンだけ元に戻す">↺</button>` : ""}
           </div>`;

      // 分割前の順序で顔コマの要否を決める。PL発言を非表示にしていても、
      // PC → PL → PC なら2つ目のPCには再び顔コマを付ける。
      // 「一言」「二言」のようにPLが挟まらなければ、顔コマは最初だけ。
      const allParts = getSpeechParts(entry);
      const parts = allParts.map((part, index) => ({
        ...part,
        avatarStart: part.kind === "pc" && (index === 0 || allParts[index - 1].kind !== "pc"),
      })).filter(part => part.kind === "pc" ? showPcSpeech : showPlSpeech);
      if (!parts.length) return;
      const partHtml = parts.map((part, index) => {
        const isPl = part.kind === "pl";
        const nameHtml = isPl
          ? `<p class="bubble-name pl-prefix">PL</p>`
          : isConfirmed
            ? `<p class="bubble-name" style="color:${escapeHtml(displayedColor)}">${escapeHtml(displayedName)}</p>`
            : `<div class="speaker-edit"><input class="speaker-input bubble-name" data-id="${entry.id}" style="color:${escapeHtml(displayedColor)}" value="${escapeHtml(displayedName)}" aria-label="発言者名"></div>`;
        const entryColorHtml = isConfirmed || index !== 0 ? "" : `
          <input type="color" class="entry-color-picker" data-id="${entry.id}" value="${escapeHtml(displayedColor)}" title="この発言だけの色">
          ${entry.colorOverride !== null ? `<button class="revert-btn revert-entrycolor-btn" data-id="${entry.id}" title="この発言だけ色を元に戻す">↺</button>` : ""}`;
        const bubbleTextHtml = isConfirmed
          ? segmentedPreviewText(part, "bubble-text")
          : segmentedMessageTextarea(entry, part, "bubble-text", isPl ? "" : "var(--pc-bubble-bg)");
        const avatarSlot = isPl ? ""
          : part.avatarStart ? `<div class="speech-avatar-slot">${makeAvatar()}</div>`
          : `<div class="speech-avatar-slot speech-avatar-spacer" aria-hidden="true"></div>`;
        return `<div class="speech-part ${isPl ? "pl-part" : "pc-part"}" data-avatar-start="${part.avatarStart}">
          ${avatarSlot}
          <div class="bubble-content">
            <div class="bubble-name-row">${entryColorHtml}${nameHtml}</div>
            ${bubbleTextHtml}
          </div>
        </div>`;
      }).join("");
      row.innerHTML = `<div class="speech-parts">${partHtml}</div>`;
    }

    if (!isConfirmed) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-entry-btn serif-delete-entry-btn";
      del.dataset.id = entry.id;
      del.textContent = "削除";
      del.setAttribute("aria-label", "この発言を削除");
      row.appendChild(del);
      row.draggable = true;
      attachDragEvents(row, entry);
    }
    container.appendChild(row);
  });

}

function attachDragEvents(row, entry) {
  row.addEventListener("dragstart", () => {
    draggedId = entry.id;
    row.classList.add("dragging");
  });

  row.addEventListener("dragend", () => {
    row.classList.remove("dragging");
    document.querySelectorAll(".drop-indicator-top, .drop-indicator-bottom").forEach((el) => {
      el.classList.remove("drop-indicator-top", "drop-indicator-bottom");
    });
  });

  row.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (draggedId === null || draggedId === entry.id) return;

    const rect = row.getBoundingClientRect();
    const isBelow = e.clientY - rect.top > rect.height / 2;

    document.querySelectorAll(".drop-indicator-top, .drop-indicator-bottom").forEach((el) => {
      if (el !== row) el.classList.remove("drop-indicator-top", "drop-indicator-bottom");
    });
    row.classList.toggle("drop-indicator-top", !isBelow);
    row.classList.toggle("drop-indicator-bottom", isBelow);
  });

  row.addEventListener("dragleave", () => {
    row.classList.remove("drop-indicator-top", "drop-indicator-bottom");
  });

  row.addEventListener("drop", (e) => {
    e.preventDefault();
    row.classList.remove("drop-indicator-top", "drop-indicator-bottom");
    if (draggedId === null || draggedId === entry.id) return;

    const rect = row.getBoundingClientRect();
    const isBelow = e.clientY - rect.top > rect.height / 2;

    reorderByDrag(draggedId, entry.id, isBelow);
    draggedId = null;
  });
}

function attachCommonListeners() {
  document.querySelectorAll(".delete-entry-btn").forEach(button => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = Number(button.dataset.id);
      if (!confirm("この発言を削除しますか？")) return;
      allEntries = allEntries.filter(entry => entry.id !== id);
      renderMessages();
    });
  });
  document.querySelectorAll(".move-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      moveEntry(Number(btn.dataset.id), Number(btn.dataset.dir));
    });
  });

  document.querySelectorAll(".speaker-input").forEach((input) => {
    input.addEventListener("input", () => {
      const entry = allEntries.find((e) => e.id === Number(input.dataset.id));
      entry.nameOverride = input.value;
      // 分割表示された同じ発言の名前欄をその場で同期する。
      document.querySelectorAll(`.speech-part .speaker-input[data-id="${entry.id}"]`).forEach(peer => {
        if (peer !== input) peer.value = input.value;
      });
    });
    input.addEventListener("blur", () => {
      if (!input.closest(".speech-part")) renderMessages();
    });
  });

  document.querySelectorAll(".revert-name-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = allEntries.find((e) => e.id === Number(btn.dataset.id));
      entry.nameOverride = null;
      renderMessages();
    });
  });

  document.querySelectorAll(".entry-color-picker").forEach((input) => {
    input.addEventListener("input", () => {
      const entry = allEntries.find((e) => e.id === Number(input.dataset.id));
      entry.colorOverride = input.value;
    });
    input.addEventListener("change", () => renderMessages());
  });

  document.querySelectorAll(".kp-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const entry = allEntries.find((e) => e.id === Number(checkbox.dataset.id));
      entry.isKp = checkbox.checked;
      renderMessages();
    });
  });

  document.querySelectorAll(".revert-entrycolor-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = allEntries.find((e) => e.id === Number(btn.dataset.id));
      entry.colorOverride = null;
      renderMessages();
    });
  });

  document.querySelectorAll("#logPanels textarea.text-input").forEach((textarea) => {

    textarea.addEventListener("input", () => {
      const entry = allEntries.find((e) => e.id === Number(textarea.dataset.id));
      if (textarea.classList.contains("segmented-text")) {
        const start = Number(textarea.dataset.start);
        const end = Number(textarea.dataset.end);
        const oldLength = end - start;
        const delta = textarea.value.length - oldLength;
        entry.text = entry.text.slice(0, start) + textarea.value + entry.text.slice(end);
        textarea.dataset.end = String(start + textarea.value.length);
        // 同一発言の後続セグメントの位置をずらして、再描画前も編集可能にする。
        document.querySelectorAll(`.segmented-text[data-id="${entry.id}"]`).forEach(other => {
          if (other === textarea) return;
          if (Number(other.dataset.start) >= end) {
            other.dataset.start = String(Number(other.dataset.start) + delta);
            other.dataset.end = String(Number(other.dataset.end) + delta);
          }
        });
      } else entry.text = textarea.value;
      autoResizeTextarea(textarea);
      scheduleDiceSummary();
    });
    textarea.addEventListener("blur", () => {
      // ほかの画面へ切り替える途中で blur が発火する場合がある。
      // 同期的に再描画すると replaceChildren() と競合するので、処理終了後に確認する。
      if (textarea.classList.contains("segmented-text")) return;
      queueMicrotask(() => {
        if (textarea.isConnected) renderMessages();
      });
    });
  });

  document.querySelectorAll(".revert-text-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = allEntries.find((e) => e.id === Number(btn.dataset.id));
      entry.text = entry.originalText;
      renderMessages();
    });
  });

  document.querySelectorAll(".avatar-clickable").forEach((label) => {
    label.addEventListener("click", (e) => {
      const input = label.querySelector(".image-upload-input-inline");
      if (input && e.target !== input) {
        e.preventDefault();
        input.click();
      }
    });
  });

  // 盤面から画像をアップロードしたとき:この発言だけのアイコンとして設定する
  document.querySelectorAll(".image-upload-input-inline").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const char = allCharacters.find((c) => c.id === Number(input.dataset.charid));
        const newImage = { id: imageIdCounter++, data: e.target.result };
        char.images.push(newImage); // ライブラリには追加(後でサイドバーから選び直せるように)

        const entry = allEntries.find((e2) => e2.id === Number(input.dataset.id));
        entry.avatarOverrideImageId = newImage.id; // この発言だけのアイコンとして設定

        renderCharacterPanel();
        renderMessages();
      };
      reader.readAsDataURL(file);
    });
  });

  // この発言だけのアイコンを、キャラ標準のアイコンに戻す
  document.querySelectorAll(".revert-avatar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = allEntries.find((e) => e.id === Number(btn.dataset.id));
      entry.avatarOverrideImageId = null;
      renderMessages();
    });
  });
  // 高さのリセット・計測・設定をまとめて実施し、Safariでの連続レイアウト計算を抑制。
  resizeVisibleMessageTextareas();
}

function reorderByDrag(draggedId, targetId, insertAfter) {
  const sourceEntry = allEntries.find(e => e.id === draggedId);
  const targetEntity = allEntries.find(e => e.id === targetId);
  if (!sourceEntry || !targetEntity || sourceEntry.tabId !== targetEntity.tabId) return;
  const visibleEntries = getVisibleEntriesSorted(sourceEntry.tabId);
  const draggedEntry = allEntries.find((e) => e.id === draggedId);
  const targetIndex = visibleEntries.findIndex((e) => e.id === targetId);

  const prevEntry = visibleEntries[targetIndex - 1];
  const nextEntry = visibleEntries[targetIndex + 1];
  const targetEntry = visibleEntries[targetIndex];

  let newOrder;
  if (!insertAfter) {
    const before = prevEntry ? prevEntry.order : targetEntry.order - 1;
    newOrder = (before + targetEntry.order) / 2;
  } else {
    const after = nextEntry ? nextEntry.order : targetEntry.order + 1;
    newOrder = (targetEntry.order + after) / 2;
  }

  draggedEntry.order = newOrder;
  renderMessages();
}

// ==========================================
// ダークモード切り替え
// ==========================================

const themeToggleBtn = document.getElementById("themeToggleBtn");
let currentTheme = "light";

themeToggleBtn.addEventListener("click", () => {
  if (currentTheme === "light") {
    currentTheme = "dark";
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent = "☀️ ライトモード";
  } else {
    currentTheme = "light";
    document.body.classList.remove("dark-mode");
    themeToggleBtn.textContent = "🌙 ダークモード";
  }
  applyAppearanceColors();
});
applyAppearanceColors();

// ==========================================
// 確定 → プレビュー → ダウンロード機能
// ==========================================

const confirmBtn = document.getElementById("confirmBtn");
const backToEditBtn = document.getElementById("backToEditBtn");
const downloadBtn = document.getElementById("downloadBtn");

confirmBtn.addEventListener("click", () => {
  isConfirmed = true;
  normalModeBtn.style.display = "none";
  serifModeBtn.style.display = "none";
  confirmBtn.style.display = "none";
  backToEditBtn.style.display = "inline-block";
  downloadBtn.style.display = "inline-block";
  tabBar.style.display = "none";
  characterPanel.style.display = "none";
  renderMessages();
});

backToEditBtn.addEventListener("click", () => {
  isConfirmed = false;
  normalModeBtn.style.display = "inline-block";
  serifModeBtn.style.display = "inline-block";
  confirmBtn.style.display = "inline-block";
  backToEditBtn.style.display = "none";
  downloadBtn.style.display = "none";
  tabBar.style.display = "block";
  characterPanel.style.display = "block";
  renderCharacterPanel();
  renderMessages();
});

downloadBtn.addEventListener("click", () => {
  try {
    const htmlString = generateExportHtml();
    downloadFile(new Blob([htmlString], { type: "text/html;charset=utf-8" }), "loglier-log-edited.html");
  } catch (error) {
    console.error("HTML出力に失敗しました", error);
    alert("HTMLの出力に失敗しました。編集用JSONにバックアップしてから、エラーを確認してください。\n" + (error?.message || String(error)));
  }
});

function generateExportHtml() {
  const characterById = new Map(allCharacters.map(c => [c.id, c]));
  const visibleEntries = getVisibleEntriesSorted();

  const resolvedEntries = visibleEntries.map((entry) => {
    const character = characterById.get(entry.characterId);

    const overrideImage = entry.avatarOverrideImageId !== null
      ? character.images.find((img) => img.id === entry.avatarOverrideImageId)
      : null;
    const image = overrideImage || character.images.find((img) => img.id === character.imageId);

    return {
      characterId: character.id,
      tabId: entry.tabId,
      type: currentMode === "serif" ? character.type : "plain",
      name: entry.nameOverride !== null ? entry.nameOverride : character.displayName,
      color: entry.colorOverride !== null ? entry.colorOverride : character.color,
      text: entry.text,
      imageData: image ? image.data : null,
    };
  });

  const exportedColorMode = messageColorMode;
  const exportedAppearance = normalizeAppearanceColors(appearanceColors);
  const outputDiceGlowCss = ""; // ダイス結果に文字色変更・光彩は適用しない
  const exportTextStyle = (e) => exportedColorMode === "name" ? ` style="color:${escapeHtml(e.color)}"` : "";
  const renderExportEntry = (e) => {
    if (e.type === "narration") {
      return `<div class="out-narration ${diceOutcome(e.text)}"${exportTextStyle(e)}>${escapeHtml(e.text)}</div>`;
    }
    if (e.type === "kp") {
      return `<div class="out-kp ${diceOutcome(e.text)}"${exportTextStyle(e)}>${escapeHtml(e.text)}</div>`;
    }
    if (e.type === "serif") {
      const parts = parseDiceRecords(e.text).length
        ? [{kind:"pl", text:e.text}] : splitSpeechParts(e.text);
      return parts.map((part, index) => {
        // 連続PCセリフは顔コマを共有。PLが挟まれば次のPCで再表示する。
        const avatarStart = part.kind === "pc" && (index === 0 || parts[index - 1].kind !== "pc");
        const avatar = part.kind !== "pc" ? "" : avatarStart
          ? `<div class="out-avatar" style="${e.imageData ? `background-image:url(${e.imageData});background-size:cover;` : ""}"></div>`
          : `<div class="out-avatar out-avatar-spacer" aria-hidden="true"></div>`;
        return `<div class="out-bubble-row out-speech-${part.kind} ${diceOutcome(e.text)}" data-characterid="${e.characterId}">
          ${avatar}
          <div class="out-bubble-content">
            <p class="out-name" style="color:${escapeHtml(e.color)}">${part.kind === "pl" ? "PL" : escapeHtml(e.name)}</p>
            <p class="out-bubble-text"${exportTextStyle(e)}>${escapeHtml(part.text)}</p>
          </div>
        </div>`;
      }).join("\n");
    }
    return `
      <div class="out-plain-row ${diceOutcome(e.text)}${e.imageData ? " has-out-plain-avatar" : ""}">
        ${e.imageData ? `<img class="out-plain-avatar" src="${escapeHtml(e.imageData)}" alt="" loading="lazy" decoding="async">` : ""}
        <span class="out-plain-name" style="color:${e.color}">${escapeHtml(e.name)}</span>
        <span class="out-plain-text"${exportTextStyle(e)}>${escapeHtml(e.text)}</span>
      </div>
    `;
  };


  const exportedTabs = allTabs.filter((tab) => tab.visible && resolvedEntries.some((e) => e.tabId === tab.id));
  const bodyRows = exportedTabs.map((tab) => {
    const rows = resolvedEntries.filter((entry) => entry.tabId === tab.id).map(renderExportEntry).join("\n");
    return `<section class="out-log-panel" data-tabid="${tab.id}" aria-label="${escapeHtml(tab.name)}"><h2 class="out-panel-heading">${escapeHtml(tab.name)} <button type="button" class="out-top-btn" aria-label="${escapeHtml(tab.name)}の先頭へ">↑ 先頭へ</button></h2>${rows}</section>`;
  }).join("\n");
  const exportTabButtons = exportedTabs.map((tab, index) =>
    `<button type="button" class="out-tab-btn" data-tabid="${tab.id}" aria-pressed="${index === 0}">${escapeHtml(tab.name)}</button>`
  ).join("\n");
  const viewpointOptionsHtml = currentMode === "serif"
    ? allCharacters.map((c) => `<option value="${c.id}" ${c.id === viewpointCharacterId ? "selected" : ""}>${escapeHtml(c.displayName)}</option>`).join("")
    : "";

  const viewpointBarHtml = currentMode === "serif"
    ? `<div class="out-toolbar-item"><label>視点: </label><select id="outViewpointSelect">${viewpointOptionsHtml}</select></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>loglier ログ</title>
<style>
:root {
  --bg-color: #ffffff;
  --text-color: #222222;
  --muted-text: #888888;
  --kp-bg: #eeeeee;
  --kp-border: #cccccc;
  --kp-text: #555555;
  --bubble-other-bg: #eeeeee;
  --bubble-self-bg: #cfe8ff;
  --pc-bubble-bg: #c9eddd;
  --pc-bubble-border: #79bda3;
  --pl-bubble-bg: color-mix(in srgb,#eeeeee 60%,transparent);
  --message-neutral-color: #111111;
}
body.dark-mode {
  --bg-color: #1e1e1e;
  --text-color: #e0e0e0;
  --muted-text: #999999;
  --kp-bg: #333333;
  --kp-border: #555555;
  --kp-text: #cccccc;
  --bubble-other-bg: #333333;
  --bubble-self-bg: #2c5a7a;
  --pc-bubble-bg: #235747;
  --pc-bubble-border: #6ca88c;
  --pl-bubble-bg: #30343d;
  --message-neutral-color: #f1f1f1;
}
body.dark-mode .out-bubble-text:not([style*="color:"]), body.dark-mode .out-plain-text:not([style*="color:"]) { color:#f1f1f1; }
body {
  font-family: sans-serif;
  padding: 20px;
  background: var(--bg-color);
  color: var(--text-color);
  max-width: 1100px;
  margin: 0 auto;
}
.out-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.out-toolbar button, .out-toolbar select {
  padding: 4px 10px;
  cursor: pointer;
}
/* 黒文字モードのときのみダイス結果に光彩を付ける。 */
${outputDiceGlowCss}
.out-narration {
  max-width:84%; margin-left:auto !important; margin-right:auto !important;
  text-align: center;
  color: var(--message-neutral-color);
  margin: 10px 0;
}
.out-kp {
  box-sizing:border-box; width:94%; max-width:820px; min-height:64px;
  margin-left:auto !important; margin-right:auto !important;
  background: var(--kp-bg);
  border: 1px solid var(--kp-border);
  color: var(--message-neutral-color);
  border-radius: 6px;
  padding: 11px 16px; line-height:1.65; overflow-wrap:anywhere;
  margin: 10px 0;
}
.out-bubble-row {
  padding-bottom:12px; border-bottom:1px solid var(--kp-border);
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 12px;
  max-width: 85%;
}
.out-bubble-row.out-speech-pl { opacity:.78; }
.out-bubble-row.out-speech-pl .out-bubble-text {
  background:var(--pl-bubble-bg);
  border:1px solid var(--kp-border);
  font-size:.94em; border-radius:10px; padding:7px 11px;
}
.out-bubble-row.out-speech-pl .out-name { font-weight:500; }
.out-bubble-row.self {
  flex-direction: row-reverse;
  margin-left: auto;
}
.out-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bubble-other-bg);
  flex-shrink: 0;
}
.out-avatar-spacer { background:transparent; box-shadow:none; }
.out-bubble-content { display: flex; flex-direction: column; gap: 2px; min-width:0; max-width:100%; }
.out-name { font-size: 0.8em; font-weight: bold; margin: 0 4px; }
.out-bubble-text {
  color:var(--message-neutral-color); white-space:pre-wrap; overflow-wrap:anywhere;
  background: var(--bubble-other-bg);
  border-radius: 12px;
  padding: 8px 12px;
  margin: 0;
}
.out-bubble-row.self:not(.out-speech-pl) .out-bubble-text {
  color:var(--message-neutral-color); white-space:pre-wrap; overflow-wrap:anywhere;
  background: var(--bubble-self-bg);
}
/* PCセリフだけを青系の明確な背景色に。PL発言は上の淡い灰色のまま。 */
.out-bubble-row.out-speech-pc .out-bubble-text,
.out-bubble-row.self.out-speech-pc .out-bubble-text {
  background:var(--pc-bubble-bg);
  border:2px solid var(--pc-bubble-border);
  box-shadow:0 1px 4px rgba(25,105,155,.12);
}
.out-plain-row { padding: 10px 4px; margin-bottom: 6px; border-bottom: 1px solid var(--kp-border); }
.out-plain-row.has-out-plain-avatar { position:relative; padding-left:56px; min-height:48px; }
.out-plain-avatar { position:absolute; width:42px; height:42px; left:4px; top:10px; border-radius:10px; object-fit:cover; }
.out-plain-text { white-space:pre-wrap; color:var(--message-neutral-color); }
.out-plain-name { font-weight: bold; display: block; margin-bottom: 4px; }
.out-tab-toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:12px 0 18px; }
.out-tab-toolbar button { border:1px solid var(--kp-border); border-radius:6px; padding:8px 12px; background:var(--bg-color); color:var(--text-color); cursor:pointer; }
.out-tab-toolbar button[aria-pressed="true"] { border-color:#599ad3; background:var(--bubble-self-bg); }
body.out-hide-pc .out-speech-pc, body.out-hide-pl .out-speech-pl { display:none !important; }
.out-panels { display:block; }
.out-log-panel { max-width:600px; margin:0 auto; min-width:0; }
.out-panel-heading { font-size:1.1rem; border-bottom:1px solid var(--kp-border); padding-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
.out-top-btn { cursor:pointer; border:1px solid var(--kp-border); border-radius:6px; background:var(--bg-color); color:var(--text-color); font-size:.72rem; padding:5px 9px; white-space:nowrap; }
.out-panels.side-by-side .out-panel-heading { position:sticky; top:0; z-index:2; background:var(--bg-color); }
.out-panels.tabs .out-log-panel { display:none; }
.out-panels.tabs .out-log-panel.active { display:block; }
.out-panels.side-by-side { display:grid; grid-template-columns:repeat(var(--panel-count),minmax(0,1fr)); gap:20px; align-items:start; }
.out-panels.side-by-side .out-log-panel { width:100%; box-sizing:border-box; height:calc(100dvh - 175px); min-height:300px; overflow-y:auto; overscroll-behavior-y:contain; padding:0 8px; }
.out-panels.side-by-side .out-tab-btn { display:none; }
@media (max-width:700px) { body { padding:10px; } .out-panels.side-by-side { display:flex; overflow-x:auto; gap:12px; scroll-snap-type:x mandatory; } .out-panels.side-by-side .out-log-panel { flex:0 0 min(86vw,430px); scroll-snap-align:start; } }

</style>
</head>
<body>
<div class="out-toolbar">
  <button id="outThemeBtn">🌙 ダークモード</button>
  ${viewpointBarHtml}
  ${currentMode === "serif" ? `<label><input type="checkbox" id="outShowPc" ${showPcSpeech ? "checked" : ""}> セリフ</label><label><input type="checkbox" id="outShowPl" ${showPlSpeech ? "checked" : ""}> PL発言</label>` : ""}
</div>
<nav class="out-tab-toolbar" aria-label="ログタブ切り替え">
  <button id="outTabsMode" type="button" aria-pressed="true">タブ切り替え</button>
  <button id="outSplitMode" type="button" aria-pressed="false">横並び表示</button>
  <span id="outTabButtons">${exportTabButtons}</span>
</nav>
<main id="outPanels" class="out-panels tabs" style="--panel-count:${exportedTabs.length}">${bodyRows}</main>

<script>
  var outThemeBtn = document.getElementById("outThemeBtn");
  var isDark = false;
  var outAppearance = ${JSON.stringify(exportedAppearance)};
  function syncExportAppearance() {
    var palette = outAppearance[isDark ? "dark" : "light"] || {};
    ["--pc-bubble-bg","--pc-bubble-border","--pl-bubble-bg","--bg-color"].forEach(function(name){document.body.style.removeProperty(name)});
    if(palette.pcBubble) {
      document.body.style.setProperty("--pc-bubble-bg", palette.pcBubble);
      document.body.style.setProperty("--pc-bubble-border", "color-mix(in srgb, var(--pc-bubble-bg) 60%, var(--text-color))");
    }
    if(palette.plBubble) document.body.style.setProperty("--pl-bubble-bg", palette.plBubble);
    if(palette.logBackground) document.body.style.setProperty("--bg-color", palette.logBackground);
  }
  syncExportAppearance();
  outThemeBtn.addEventListener("click", function() {
    isDark = !isDark;
    document.body.classList.toggle("dark-mode", isDark);
    outThemeBtn.textContent = isDark ? "☀️ ライトモード" : "🌙 ダークモード";
    syncExportAppearance();
  });

  var outPc = document.getElementById("outShowPc");
  var outPl = document.getElementById("outShowPl");
  function syncOutSpeech() {
    document.body.classList.toggle("out-hide-pc", !!outPc && !outPc.checked);
    document.body.classList.toggle("out-hide-pl", !!outPl && !outPl.checked);
  }
  if (outPc) outPc.addEventListener("change", syncOutSpeech);
  if (outPl) outPl.addEventListener("change", syncOutSpeech);
  syncOutSpeech();
  var outPanels = document.getElementById("outPanels");
  var outTabButtons = Array.from(document.querySelectorAll(".out-tab-btn"));
  var outSections = Array.from(document.querySelectorAll(".out-log-panel"));
  var outTabsMode = document.getElementById("outTabsMode");
  var outSplitMode = document.getElementById("outSplitMode");
  var activeTab = outTabButtons.length ? outTabButtons[0].dataset.tabid : null;
  function showOutputTab(id) {
    activeTab = id;
    outSections.forEach(function(section) { section.classList.toggle("active", section.dataset.tabid === id); });
    outTabButtons.forEach(function(btn) { btn.setAttribute("aria-pressed", String(btn.dataset.tabid === id)); });
  }
  outTabButtons.forEach(function(btn) { btn.addEventListener("click", function() {
    outPanels.classList.replace("side-by-side", "tabs");
    outTabsMode.setAttribute("aria-pressed", "true");
    outSplitMode.setAttribute("aria-pressed", "false");
    showOutputTab(btn.dataset.tabid);
  }); });
  outTabsMode.addEventListener("click", function() {
    outPanels.classList.replace("side-by-side", "tabs");
    outTabsMode.setAttribute("aria-pressed", "true");
    outSplitMode.setAttribute("aria-pressed", "false");
    showOutputTab(activeTab);
  });
  outSplitMode.addEventListener("click", function() {
    outPanels.classList.replace("tabs", "side-by-side");
    outTabsMode.setAttribute("aria-pressed", "false");
    outSplitMode.setAttribute("aria-pressed", "true");
  });
  showOutputTab(activeTab);
  document.querySelectorAll(".out-top-btn").forEach(function(btn) {
    btn.addEventListener("click",function() {
      if(outPanels.classList.contains("side-by-side")) btn.closest(".out-log-panel").scrollTo({top:0,behavior:"smooth"});
      else window.scrollTo({top:0,behavior:"smooth"});
    });
  });
  var outViewpointSelect = document.getElementById("outViewpointSelect");
  if (outViewpointSelect) {
    function applyViewpoint() {
      var selectedId = outViewpointSelect.value;
      document.querySelectorAll(".out-bubble-row").forEach(function(row) {
        if (row.dataset.characterid === selectedId) {
          row.classList.add("self");
        } else {
          row.classList.remove("self");
        }
      });
    }
    outViewpointSelect.addEventListener("change", applyViewpoint);
    applyViewpoint();
  }
<\/script>
</body>
</html>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// 端末への保存(オプトイン)
// ==========================================

const DB_NAME = "cocofoliaEditorDB";
const STORE_NAME = "state";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveStateToIndexedDB(state) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, "savedState");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadStateFromIndexedDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get("savedState");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteStateFromIndexedDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete("savedState");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const autosaveCheckbox = document.getElementById("autosaveCheckbox");
const deleteSavedDataBtn = document.getElementById("deleteSavedDataBtn");

try { autosaveCheckbox.checked = localStorage.getItem("cocofolia_autosave_enabled") === "true"; }
catch (error) { autosaveCheckbox.checked = false; console.warn("ブラウザのローカル保存が利用できません",error); }

autosaveCheckbox.addEventListener("change", () => {
  try { localStorage.setItem("cocofolia_autosave_enabled", autosaveCheckbox.checked); }
  catch (error) { console.warn("保存設定を記録できません",error); }

  if (!autosaveCheckbox.checked) {
    deleteStateFromIndexedDB();
  } else {
    saveCurrentStateIfEnabled();
  }
});

deleteSavedDataBtn.addEventListener("click", async () => {
  await deleteStateFromIndexedDB();
  alert("保存データを削除しました");
});

function buildStateObject() {
  return {
    entries: allEntries,
    tabs: allTabs,
    characters: allCharacters,
    currentMode,
    viewpointCharacterId,
    imageIdCounter,
    editorTabLayout,
    messageColorMode,
    modeTextColors,
    appearanceColors,
    appearanceDefaultsVersion: 15,
    initialSkillRulesText,
    showPcSpeech,
    showPlSpeech,
  };
}

// 編集用JSONは本アプリ専用。ココフォリア公式JSONとは異なる。
const PROJECT_FORMAT = "fukidashi-note-project";
const PROJECT_VERSION = 1;
const projectFileInput = document.getElementById("projectFileInput");

document.getElementById("exportProjectBtn").addEventListener("click", () => {
  if (!allEntries.length) { alert("先にログを読み込んでください。"); return; }
  const project = { format: PROJECT_FORMAT, version: PROJECT_VERSION, exportedAt: new Date().toISOString(), state: buildStateObject() };
  downloadFile(new Blob([JSON.stringify(project, null, 2)], { type: "application/json;charset=utf-8" }), "loglier-project.json");
});

document.getElementById("importProjectBtn").addEventListener("click", () => projectFileInput.click());
projectFileInput.addEventListener("change", async () => {
  const file = projectFileInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error("JSONファイルが大きすぎます（上限50MB）。");
    const project = JSON.parse(await file.text());
    if (project?.format !== PROJECT_FORMAT || project.version !== PROJECT_VERSION)
      throw new Error("対応する編集用JSONではありません。ココフォリア公式JSONはまだ読み込めません。");
    const state = project.state;
    if (!isValidProjectState(state)) throw new Error("編集データの構造が正しくありません。");
    if (allEntries.length && !confirm("現在の編集内容を読み込んだJSONで置き換えますか？")) return;
    hasUserLoadedData = true;
    restoreEditorState(state);
    saveCurrentStateIfEnabled();
  } catch (error) {
    alert("JSONを読み込めませんでした: " + error.message);
  } finally { projectFileInput.value = ""; }
});

function isValidProjectState(state) {
  if (!state || !Array.isArray(state.entries) || !Array.isArray(state.tabs) || !Array.isArray(state.characters)) return false;
  if (!state.entries.every(e => Number.isInteger(e.id) && Number.isFinite(e.order) && Number.isInteger(e.tabId) && Number.isInteger(e.characterId) && typeof e.text === "string")) return false;
  if (!state.tabs.every(t => Number.isInteger(t.id) && typeof t.name === "string" && typeof t.visible === "boolean")) return false;
  if (!state.characters.every(c => Number.isInteger(c.id) && typeof c.displayName === "string" && Array.isArray(c.images))) return false;
  if (!state.entries.every(e => state.tabs.some(t => t.id === e.tabId) && state.characters.some(c => c.id === e.characterId))) return false;
  return ["normal", "serif"].includes(state.currentMode) && Number.isInteger(state.imageIdCounter);
}

function restoreEditorState(saved) {
  // 古い保存済みログにも、文末スラッシュの取り除きを適用する。
  allEntries = saved.entries.map(entry => ({...entry, text:stripTrailingSlash(entry.text)}));
  allTabs = saved.tabs;
  allCharacters = saved.characters;
  currentMode = saved.currentMode;
  viewpointCharacterId = saved.viewpointCharacterId;
  imageIdCounter = saved.imageIdCounter;
  // v13以前に自動保存された古い設定が、新しい初期値を上書きする問題を修正。
  // v14からの保存ではユーザー自身の選択を保持する。
  const previousDefaults = (saved.appearanceDefaultsVersion ?? 0) < 14;
  // 旧バージョンの単一文字色設定に関係なく、通常＝名前色、会話＝黒を基準にする。
  // v15以降の各モード個別設定だけを引き継ぐ。
  modeTextColors = {
    normal: saved.modeTextColors?.normal === "black" ? "black" : "name",
    serif: saved.modeTextColors?.serif === "name" ? "name" : "black",
  };
  syncModeTextColor();
  appearanceColors = normalizeAppearanceColors(saved.appearanceColors);
  if (previousDefaults) {
    // 旧版の保存色を引き継がず、新しい標準の緑を初回のみ反映。
    appearanceColors.light.pcBubble = null;
    appearanceColors.dark.pcBubble = null;
  }
  applyAppearanceColors();
  initialSkillRulesText = typeof saved.initialSkillRulesText === "string" ? saved.initialSkillRulesText : "";
  initialSkillRulesInput.value = initialSkillRulesText;
  showPcSpeech = saved.showPcSpeech !== false;
  showPlSpeech = saved.showPlSpeech !== false;
  syncSpeechVisibilityControls();
  isConfirmed = false;
  activeTabId = allTabs.find(t => t.visible)?.id ?? null;
  editorTabLayout = saved.editorTabLayout === "split" ? "split" : "tabs";
  normalModeBtn.classList.toggle("active", currentMode === "normal");
  serifModeBtn.classList.toggle("active", currentMode === "serif");
  document.body.classList.toggle("serif-mode", currentMode === "serif");
  viewpointBar.style.display = currentMode === "serif" ? "block" : "none";
  normalModeBtn.style.display = "inline-block";
  serifModeBtn.style.display = "inline-block";
  confirmBtn.style.display = "inline-block";
  backToEditBtn.style.display = "none";
  downloadBtn.style.display = "none";
  tabBar.style.display = "block";
  characterPanel.style.display = "block";
  renderTabBar(); renderCharacterPanel(); renderViewpointSelect(); renderMessages();
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function saveCurrentStateIfEnabled() {
  if (!autosaveCheckbox.checked) return;
  if (allEntries.length === 0) return;
  saveStateToIndexedDB(buildStateObject()).catch(error => console.warn("自動保存に失敗しました。編集内容をJSONに書き出してください", error));
}

setInterval(saveCurrentStateIfEnabled, 3000);

window.addEventListener("load", async () => {
  if (!autosaveCheckbox.checked) return;

  let saved;
  try { saved = await loadStateFromIndexedDB(); } catch (error) { console.warn("保存データを復元できませんでした", error); return; }
  if (!saved) return;

  if (!hasUserLoadedData && allEntries.length === 0 && isValidProjectState(saved)) restoreEditorState(saved);
});

// ==========================================
// サイドバーメニューの開閉(スマホ向け)
// ==========================================

const menuToggleBtn = document.getElementById("menuToggleBtn");
const sidebar = document.getElementById("sidebar");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");

menuToggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  // 開いている間は、タイトルと被らないよう外側のボタンを隠す
  menuToggleBtn.style.display = sidebar.classList.contains("open") ? "none" : "";
});

sidebarCloseBtn.addEventListener("click", () => {
  sidebar.classList.remove("open");
  menuToggleBtn.style.display = "";
});

document.querySelector(".main-content").addEventListener("click", () => {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    menuToggleBtn.style.display = "";
  }
});

// 初期描画時は全欄の書き込み→計測→書き込みをまとめる。
// 発言は全件DOMに残すのでスクロールや編集・並べ替えに件数制限はない。
function resizeVisibleMessageTextareas() {
  const areas = [...document.querySelectorAll("#logPanels textarea.text-input")];
  for (const area of areas) area.style.height = "auto";
  const heights = areas.map(area => {
    const minimum = area.classList.contains("kp-text") ? 82 :
      area.classList.contains("narration-text") ? 66 : 50;
    return Math.max(minimum, area.scrollHeight);
  });
  areas.forEach((area, index) => { area.style.height = heights[index] + "px"; });
}
// テキストエリアの高さを、中身に合わせて自動的に広げる
function autoResizeTextarea(textarea) {
  const isKp = textarea.classList.contains("kp-text");
  const isNarration = textarea.classList.contains("narration-text");
  const minimum = isKp ? 82 : (isNarration ? 66 : 50);
  textarea.style.height = "auto";
  // 非表示のタブでは scrollHeight が 0 の場合がある。
  // その場合も最低限の編集領域を残し、表示時に再計算できるようにする。
  const contentHeight = textarea.scrollHeight;
  textarea.style.height = Math.max(minimum, contentHeight) + "px";
}
// 画面幅変更時に折り返し量が変わるため、長いKP・ナレーション欄の高さを再調整する。
window.addEventListener("resize", () => {
  resizeVisibleMessageTextareas();
});
