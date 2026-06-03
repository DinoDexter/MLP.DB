(function () {
  const STORAGE_KEY = "mlpdb.metadata.v1";
  const TYPE_OPTIONS = ["item", "event", "character", "story", "scene", "main character"];
  const ARCHETYPES = ["Twilight Sparkle", "Rainbow Dash", "Pinkie Pie", "Rarity", "Fluttershy", "Applejack"];

  const rarityNames = {
    C: "Common",
    U: "Uncommon",
    RR: "Double Rare",
    SR: "Super Rare",
    GR: "Grandeur Rare",
    CR: "Character Rare",
    ER: "Event Rare",
    SPR: "Special Rare",
    PR: "Promo",
  };

  const cards = (window.CARD_IMAGE_FILES || []).map(buildCard);
  const state = loadState();
  let index = Number(localStorage.getItem("mlpdb.metadata.index") || 0);
  let activeSubtypes = [];

  const els = {
    progressText: document.getElementById("progressText"),
    cardPosition: document.getElementById("cardPosition"),
    cardImage: document.getElementById("cardImage"),
    cardId: document.getElementById("cardId"),
    rarityText: document.getElementById("rarityText"),
    prevCardBtn: document.getElementById("prevCardBtn"),
    nextCardBtn: document.getElementById("nextCardBtn"),
    form: document.getElementById("metadataForm"),
    nameInput: document.getElementById("nameInput"),
    nameSuggestions: document.getElementById("nameSuggestions"),
    costSelect: document.getElementById("costSelect"),
    costField: document.getElementById("costField"),
    typeSelect: document.getElementById("typeSelect"),
    archetypeSection: document.getElementById("archetypeSection"),
    archetypeChecks: document.getElementById("archetypeChecks"),
    characterFields: document.getElementById("characterFields"),
    inspirationSelect: document.getElementById("inspirationSelect"),
    subtypeInput: document.getElementById("subtypeInput"),
    selectedSubtypes: document.getElementById("selectedSubtypes"),
    subtypeSuggestions: document.getElementById("subtypeSuggestions"),
    markIncompleteBtn: document.getElementById("markIncompleteBtn"),
    copyJsonBtn: document.getElementById("copyJsonBtn"),
    downloadJsonBtn: document.getElementById("downloadJsonBtn"),
    jsonDialog: document.getElementById("jsonDialog"),
    jsonOutput: document.getElementById("jsonOutput"),
  };

  saveState();
  hydrateControls();
  bindEvents();
  render();

  function buildCard(file) {
    const id = file.replace(/\.jpg$/i, "");
    const normalizedId = id.replace(/^※/, "");
    const pieces = normalizedId.split("-");
    const set = pieces.length > 1 ? pieces[0] : "PR";
    const rarity = pieces.length > 1 ? pieces[1].replace(/\d+.*$/, "") : "PR";
    return {
      id,
      file,
      imageSrc: `card_images/${encodeURIComponent(file)}`,
      set,
      rarity,
      rarityName: rarityNames[rarity] || rarity,
    };
  }

  function hydrateControls() {
    els.costSelect.append(new Option("Choose cost", ""));
    for (let i = 1; i <= 10; i += 1) els.costSelect.append(new Option(String(i), String(i)));

    TYPE_OPTIONS.forEach((type) => els.typeSelect.append(new Option(toTitle(type), type)));

    els.inspirationSelect.append(new Option("Choose inspiration", ""));
    for (let i = 1; i <= 10; i += 1) els.inspirationSelect.append(new Option(String(i), String(i)));

    ARCHETYPES.forEach((archetype) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" value="${escapeAttr(archetype)}"> ${escapeHtml(archetype)}`;
      els.archetypeChecks.append(label);
    });
  }

  function bindEvents() {
    els.prevCardBtn.addEventListener("click", () => moveCard(-1));
    els.nextCardBtn.addEventListener("click", () => moveCard(1));
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCurrent(true);
    });
    els.typeSelect.addEventListener("change", updateCharacterFields);
    els.subtypeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addSubtype(els.subtypeInput.value);
        els.subtypeInput.value = "";
      }
    });
    els.markIncompleteBtn.addEventListener("click", () => {
      const card = currentCard();
      delete state.cards[card.id];
      saveState();
      render();
    });
    els.copyJsonBtn.addEventListener("click", copyJson);
    els.downloadJsonBtn.addEventListener("click", downloadJson);
  }

  function render() {
    const card = currentCard();
    const metadata = normalizeMetadata(card, state.cards[card.id] || {});
    if (state.cards[card.id]) state.cards[card.id] = metadata;
    activeSubtypes = [...(metadata.subtypes || [])];

    localStorage.setItem("mlpdb.metadata.index", String(index));
    els.cardImage.src = card.imageSrc;
    els.cardImage.alt = card.id;
    els.cardId.textContent = card.id;
    els.rarityText.textContent = card.rarityName;
    els.cardPosition.textContent = `Card ${index + 1} of ${cards.length}`;
    els.prevCardBtn.disabled = index === 0;
    els.nextCardBtn.disabled = index === cards.length - 1;

    els.nameInput.value = metadata.name || "";
    els.costSelect.value = metadata.cost ? String(metadata.cost) : "";
    els.typeSelect.value = metadata.type || TYPE_OPTIONS[0];
    els.inspirationSelect.value = metadata.inspiration ? String(metadata.inspiration) : "";
    [...els.archetypeChecks.querySelectorAll("input")].forEach((input) => {
      input.checked = (metadata.archetypes || []).includes(input.value);
    });

    updateCharacterFields();
    renderSuggestions();
    renderSubtypes();
    updateProgress();
  }

  function saveCurrent(advance) {
    const card = currentCard();
    const type = els.typeSelect.value;
    const rawMetadata = {
      id: card.id,
      name: els.nameInput.value.trim(),
      cost: Number(els.costSelect.value) || null,
      set: card.set,
      rarity: card.rarity,
      type,
      archetypes: [...els.archetypeChecks.querySelectorAll("input:checked")].map((input) => input.value),
    };

    if (type === "character") {
      rawMetadata.inspiration = Number(els.inspirationSelect.value) || null;
      rawMetadata.subtypes = [...activeSubtypes];
    }

    const metadata = normalizeMetadata(card, rawMetadata);
    state.cards[card.id] = metadata;
    if (metadata.name) addRecent("names", metadata.name);
    activeSubtypes.forEach((subtype) => addRecent("subtypes", subtype));
    saveState();

    if (advance && index < cards.length - 1) {
      index += 1;
      render();
    } else {
      render();
    }
  }

  function moveCard(delta) {
    index = Math.min(cards.length - 1, Math.max(0, index + delta));
    render();
  }

  function updateCharacterFields() {
    const type = els.typeSelect.value;
    els.costField.hidden = !allowsCost(type);
    els.archetypeSection.hidden = !allowsArchetypes(type);
    els.characterFields.hidden = type !== "character";
  }

  function allowsCost(type) {
    return type !== "main character" && type !== "story" && type !== "scene";
  }

  function allowsArchetypes(type) {
    return type !== "main character" && type !== "story" && type !== "scene";
  }

  function renderSuggestions() {
    renderSuggestionList(els.nameSuggestions, state.recent.names, (name) => {
      els.nameInput.value = name;
    });
    renderSuggestionList(els.subtypeSuggestions, state.recent.subtypes, addSubtype);
  }

  function renderSuggestionList(container, values, onClick) {
    container.replaceChildren();
    values.slice(0, 24).forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = value;
      button.addEventListener("click", () => onClick(value));
      container.append(button);
    });
  }

  function addSubtype(value) {
    const subtype = value.trim();
    if (!subtype || activeSubtypes.includes(subtype)) return;
    activeSubtypes.push(subtype);
    addRecent("subtypes", subtype);
    renderSubtypes();
    renderSuggestions();
  }

  function renderSubtypes() {
    els.selectedSubtypes.replaceChildren();
    activeSubtypes.forEach((subtype) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.innerHTML = `${escapeHtml(subtype)} <button type="button" aria-label="Remove ${escapeAttr(subtype)}">x</button>`;
      pill.querySelector("button").addEventListener("click", () => {
        activeSubtypes = activeSubtypes.filter((item) => item !== subtype);
        renderSubtypes();
      });
      els.selectedSubtypes.append(pill);
    });
  }

  function updateProgress() {
    const complete = Object.keys(state.cards).length;
    els.progressText.textContent = `${complete} / ${cards.length}`;
  }

  function addRecent(key, value) {
    state.recent[key] = [value, ...state.recent[key].filter((item) => item !== value)].slice(0, 60);
  }

  async function copyJson() {
    const text = buildJson();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Some embedded browsers do not expose clipboard writes; still show the export text.
    }
    showJson(text);
  }

  function downloadJson() {
    const blob = new Blob([buildJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mlpdb-card-metadata.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function showJson(text) {
    els.jsonOutput.value = text;
    els.jsonDialog.showModal();
  }

  function buildJson() {
    return JSON.stringify(normalizedCards(), null, 2);
  }

  function currentCard() {
    return cards[index] || cards[0];
  }

  function loadState() {
    const embeddedCards = normalizeSavedCards(normalizeMetadataSource(window.CARD_METADATA));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const loaded = {
        cards: {
          ...embeddedCards,
          ...(saved.cards || {}),
        },
        recent: {
          names: saved.recent?.names || [],
          subtypes: saved.recent?.subtypes || [],
        },
      };
      loaded.cards = normalizeSavedCards(loaded.cards);
      return loaded;
    } catch {
      return { cards: embeddedCards, recent: { names: [], subtypes: [] } };
    }
  }

  function normalizeMetadataSource(source) {
    if (!source) return {};
    return source.cards || source;
  }

  function saveState() {
    state.cards = normalizeSavedCards(state.cards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizedCards() {
    return normalizeSavedCards(state.cards);
  }

  function normalizeSavedCards(savedCards) {
    return Object.fromEntries(Object.entries(savedCards)
      .map(([id, metadata]) => {
        const card = cards.find((item) => item.id === id) || cardFromMetadata(id, metadata);
        return [id, normalizeMetadata(card, metadata)];
      })
      .filter(([, metadata]) => hasMeaningfulMetadata(metadata)));
  }

  function normalizeMetadata(card, metadata) {
    const type = metadata.type || "";
    const normalized = {
      id: card.id,
      set: card.set || metadata.set,
      rarity: card.rarity || metadata.rarity,
    };

    if (metadata.name) normalized.name = metadata.name.trim();
    if (type) normalized.type = type;

    if (allowsCost(type) && metadata.cost) {
      normalized.cost = Number(metadata.cost);
    }

    if (allowsArchetypes(type) && metadata.archetypes?.length) {
      normalized.archetypes = [...metadata.archetypes];
    }

    if (type === "character") {
      if (metadata.inspiration) normalized.inspiration = Number(metadata.inspiration);
      if (metadata.subtypes?.length) normalized.subtypes = [...metadata.subtypes];
    }

    return normalized;
  }

  function hasMeaningfulMetadata(metadata) {
    return Boolean(metadata.name || metadata.type || metadata.cost || metadata.archetypes?.length
      || metadata.inspiration || metadata.subtypes?.length);
  }

  function cardFromMetadata(id, metadata) {
    return {
      id,
      set: metadata.set,
      rarity: metadata.rarity,
    };
  }

  function toTitle(value) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
