(function () {
  const STORAGE_KEY = "mlpdb.deck.v1";
  const AUTHOR_KEY = "mlpdb.author.v1";
  const UNKNOWN = "Unknown";
  const BASE_WIDTH = 1500;
  const BASE_HEIGHT = 1320;
  const METADATA_KEY = "mlpdb.metadata.v1";
  const SET_NAMES = {
    BP01: "Fantasy Wonderland",
    SD01: "Friendships Begin",
    SD01A: "Friendships Begin",
    SD01B: "Friendships Begin",
    SD01C: "Friendships Begin",
    SD01D: "Friendships Begin",
    SD01E: "Friendships Begin",
    SD01F: "Friendships Begin",
  };
  const DECK_TYPE_ORDER = ["main character", "character", "event", "item", "story", "scene"];
  const DECK_TYPE_LABELS = {
    "main character": "Main Character",
    character: "Character",
    event: "Event",
    item: "Item",
    story: "Story",
    scene: "Scene",
  };
  const MAIN_DECK_TYPES = new Set(["character", "event", "item"]);
  const DECK_VIEW_PILES = [
    { key: "main-deck", label: "Main Deck", types: ["character", "event", "item"] },
    { key: "main-character", label: "Main Character", types: ["main character"] },
    { key: "story", label: "Story Deck", types: ["story"] },
    { key: "scene", label: "Scene Deck", types: ["scene"] },
  ];

  const rarityNames = {
    C: "Common",
    U: "Uncommon",
    R: "Rare",
    RR: "Double Rare",
    SR: "Super Rare",
    GR: "Grandeur Rare",
    CR: "Character Rare",
    ER: "Event Rare",
    SPR: "Special Rare",
    PR: "Promo",
  };

  const state = {
    activeTab: "builder",
    deckName: "Untitled Deck",
    author: "anonymous",
    exportFormat: "text",
    deck: new Map(),
    filters: {
      search: "",
      cost: new Set(),
      rarity: new Set(),
      type: new Set(),
      set: new Set(),
      archetype: new Set(),
      sort: "id",
    },
    page: 1,
    pageSize: 15,
    pageCount: 1,
    isEditingPage: false,
  };

  const metadataById = loadCardMetadata();
  const cards = (window.CARD_IMAGE_FILES || []).map(buildCard);
  const cardById = new Map(cards.map((card) => [card.id, card]));

  const els = {
    appFrame: document.getElementById("appFrame"),
    appShell: document.getElementById("appShell"),
    tabButtons: [...document.querySelectorAll(".tab-button")],
    tabPages: [...document.querySelectorAll(".tab-page")],
    catalogSummary: document.getElementById("catalogSummary"),
    searchInput: document.getElementById("searchInput"),
    costFilter: document.getElementById("costFilter"),
    costFilterButton: document.getElementById("costFilterButton"),
    rarityFilter: document.getElementById("rarityFilter"),
    rarityFilterButton: document.getElementById("rarityFilterButton"),
    typeFilter: document.getElementById("typeFilter"),
    typeFilterButton: document.getElementById("typeFilterButton"),
    setFilter: document.getElementById("setFilter"),
    setFilterButton: document.getElementById("setFilterButton"),
    archetypeFilter: document.getElementById("archetypeFilter"),
    archetypeFilterButton: document.getElementById("archetypeFilterButton"),
    sortSelect: document.getElementById("sortSelect"),
    resultsCount: document.getElementById("resultsCount"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    prevPageBtn: document.getElementById("prevPageBtn"),
    nextPageBtn: document.getElementById("nextPageBtn"),
    pageInfo: document.getElementById("pageInfo"),
    cardGrid: document.getElementById("cardGrid"),
    deckNameInput: document.getElementById("deckNameInput"),
    deckAuthorInput: document.getElementById("deckAuthorInput"),
    deckCount: document.getElementById("deckCount"),
    mainDeckCount: document.getElementById("mainDeckCount"),
    deckList: document.getElementById("deckList"),
    importClipboardBtn: document.getElementById("importClipboardBtn"),
    clearDeckBtn: document.getElementById("clearDeckBtn"),
    exportImageBtn: document.getElementById("exportImageBtn"),
    exportDeckNameInput: document.getElementById("exportDeckNameInput"),
    authorInput: document.getElementById("authorInput"),
    permalinkInput: document.getElementById("permalinkInput"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    exportFormatButtons: [...document.querySelectorAll("[data-export-format]")],
    copyIdsBtn: document.getElementById("copyIdsBtn"),
    downloadIdsBtn: document.getElementById("downloadIdsBtn"),
    exportStatus: document.getElementById("exportStatus"),
    deckViewName: document.getElementById("deckViewName"),
    deckViewAuthor: document.getElementById("deckViewAuthor"),
    deckImageGrid: document.getElementById("deckImageGrid"),
    exportDialog: document.getElementById("exportDialog"),
    dialogTitle: document.getElementById("dialogTitle"),
    exportText: document.getElementById("exportText"),
    dialogExportText: document.getElementById("dialogExportText"),
    copyDialogBtn: document.getElementById("copyDialogBtn"),
    importDialog: document.getElementById("importDialog"),
    importText: document.getElementById("importText"),
    applyImportBtn: document.getElementById("applyImportBtn"),
    cardPreviewDialog: document.getElementById("cardPreviewDialog"),
    previewImage: document.getElementById("previewImage"),
    closePreviewBtn: document.getElementById("closePreviewBtn"),
  };

  loadDeck();
  setupViewportScale();
  hydrateFilters();
  bindEvents();
  render();

  function setupViewportScale() {
    const scalePage = () => {
      const scale = window.innerWidth / BASE_WIDTH;
      els.appFrame.style.width = `${BASE_WIDTH * scale}px`;
      els.appFrame.style.height = `${BASE_HEIGHT * scale}px`;
      els.appShell.style.setProperty("--app-scale", String(scale));
    };

    scalePage();
    window.addEventListener("resize", scalePage);
  }

  function buildCard(file) {
    const id = file.replace(/\.jpg$/i, "");
    const normalizedId = id.replace(/^※/, "");
    const pieces = normalizedId.split("-");
    const setCode = pieces.length > 1 ? pieces[0] : "PR";
    const rarityCode = pieces.length > 1 ? pieces[1].replace(/\d+.*$/, "") : "PR";
    const numberMatch = normalizedId.match(/(\d+)(?:-A\d+)?$/);
    const variantMatch = normalizedId.match(/-A\d+$/);
    const override = (window.CARD_METADATA_OVERRIDES || {})[id] || {};
    const stored = metadataById[id] || metadataById[normalizedId] || {};
    const metadata = { ...stored, ...override };

    return {
      id,
      exportId: normalizedId,
      file,
      imageSrc: `card_images/${encodeURIComponent(file)}`,
      name: metadata.name || id,
      setCode: metadata.set || setCode,
      set: getSetName(metadata.set || setCode),
      rarity: metadata.rarity || rarityCode || UNKNOWN,
      rarityName: metadata.rarityName || rarityNames[metadata.rarity || rarityCode] || metadata.rarity || rarityCode || UNKNOWN,
      cost: metadata.cost ?? null,
      type: metadata.type || UNKNOWN,
      archetypes: metadata.archetypes?.length ? metadata.archetypes : ["Generic"],
      inspiration: metadata.inspiration ?? null,
      subtypes: metadata.subtypes || [],
      number: numberMatch ? Number(numberMatch[1]) : 0,
      isAlt: id.startsWith("※") || Boolean(variantMatch),
    };
  }

  function hydrateFilters() {
    fillMultiFilter("cost", unique(cards.map((card) => card.cost).filter((cost) => cost != null), compareCosts), "Cost");
    fillMultiFilter("rarity", unique(cards.map((card) => card.rarity), compareText), "Rarity");
    fillMultiFilter("type", unique(cards.map((card) => card.type), compareText), "Type");
    fillMultiFilter("set", unique(cards.map((card) => card.set), compareText), "Set");
    fillMultiFilter("archetype", unique(cards.flatMap((card) => card.archetypes), compareText), "Archetype");
  }

  function fillMultiFilter(key, values, allLabel) {
    const container = els[`${key}Filter`];
    const button = els[`${key}FilterButton`];
    container.replaceChildren();
    button.textContent = allLabel;
    button.addEventListener("click", () => toggleFilterMenu(key));

    values.forEach((value) => {
      const label = document.createElement("label");
      label.className = "filter-option";
      label.innerHTML = `<input type="checkbox" value="${escapeAttr(value)}"> <span>${escapeHtml(value)}</span>`;
      label.querySelector("input").addEventListener("change", (event) => {
        if (event.target.checked) {
          state.filters[key].add(String(value));
          label.classList.add("selected");
        } else {
          state.filters[key].delete(String(value));
          label.classList.remove("selected");
        }
        updateFilterButton(key, allLabel);
        state.page = 1;
        renderCatalog();
      });
      container.append(label);
    });
  }

  function toggleFilterMenu(key) {
    const container = els[`${key}Filter`];
    document.querySelectorAll(".filter-menu.open").forEach((menu) => {
      if (menu !== container) menu.classList.remove("open");
    });
    container.classList.toggle("open");
  }

  function updateFilterButton(key, allLabel) {
    const selected = [...state.filters[key]];
    const button = els[`${key}FilterButton`];
    button.classList.toggle("has-selection", selected.length > 0);
    if (!selected.length) {
      button.textContent = allLabel;
    } else if (selected.length === 1) {
      button.textContent = `${allLabel}: ${selected[0]}`;
    } else {
      button.textContent = `${allLabel}: ${selected.length} selected`;
    }
  }

  function clearMultiFilter(key, allLabel) {
    els[`${key}Filter`].querySelectorAll("input").forEach((input) => {
      input.checked = false;
      input.closest(".filter-option")?.classList.remove("selected");
    });
    els[`${key}Filter`].classList.remove("open");
    els[`${key}FilterButton`].textContent = allLabel;
    els[`${key}FilterButton`].classList.remove("has-selection");
  }

  function bindEvents() {
    els.tabButtons.forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    });

    els.searchInput.addEventListener("input", () => {
      state.filters.search = els.searchInput.value.trim().toLowerCase();
      state.page = 1;
      renderCatalog();
    });

    els.sortSelect.addEventListener("change", () => {
      state.filters.sort = els.sortSelect.value;
      state.page = 1;
      renderCatalog();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".multi-filter")) {
        document.querySelectorAll(".filter-menu.open").forEach((menu) => menu.classList.remove("open"));
      }
    });

    els.resetFiltersBtn.addEventListener("click", () => {
      state.filters = {
        search: "",
        cost: new Set(),
        rarity: new Set(),
        type: new Set(),
        set: new Set(),
        archetype: new Set(),
        sort: "id",
      };
      els.searchInput.value = "";
      clearMultiFilter("cost", "Cost");
      clearMultiFilter("rarity", "Rarity");
      clearMultiFilter("type", "Type");
      clearMultiFilter("set", "Set");
      clearMultiFilter("archetype", "Archetype");
      els.sortSelect.value = "id";
      state.page = 1;
      renderCatalog();
    });

    els.prevPageBtn.addEventListener("click", () => {
      state.page = Math.max(1, state.page - 1);
      renderCatalog();
    });

    els.nextPageBtn.addEventListener("click", () => {
      state.page += 1;
      renderCatalog();
    });

    els.pageInfo.addEventListener("click", startPageEdit);

    els.deckNameInput.addEventListener("input", () => {
      updateDeckName(els.deckNameInput.value, false, "builder");
    });
    els.deckNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        els.deckNameInput.blur();
      }
    });
    els.deckNameInput.addEventListener("blur", () => {
      updateDeckName(els.deckNameInput.value, true, "builder");
    });

    els.deckAuthorInput.addEventListener("focus", () => {
      els.deckAuthorInput.value = state.author;
      els.deckAuthorInput.select();
    });
    els.deckAuthorInput.addEventListener("input", () => {
      updateAuthor(els.deckAuthorInput.value, false, "builder");
    });
    els.deckAuthorInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        els.deckAuthorInput.blur();
      }
    });
    els.deckAuthorInput.addEventListener("blur", () => {
      updateAuthor(els.deckAuthorInput.value, true, "builder");
    });

    els.exportDeckNameInput.addEventListener("input", () => {
      updateDeckName(els.exportDeckNameInput.value, false, "export");
    });
    els.exportDeckNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        els.exportDeckNameInput.blur();
      }
    });
    els.exportDeckNameInput.addEventListener("blur", () => {
      updateDeckName(els.exportDeckNameInput.value, true, "export");
    });

    els.authorInput.addEventListener("input", () => {
      updateAuthor(els.authorInput.value, false, "export");
    });
    els.authorInput.addEventListener("blur", () => {
      updateAuthor(els.authorInput.value, true, "export");
    });

    els.clearDeckBtn.addEventListener("click", () => {
      if (state.deck.size === 0 || confirm("Clear the current deck?")) {
        state.deck.clear();
        saveDeck();
        renderDeck();
        renderCatalog();
        renderExport();
        renderDeckView();
      }
    });
    els.importClipboardBtn.addEventListener("click", importFromClipboard);

    els.exportFormatButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.exportFormat = button.dataset.exportFormat;
        renderExport();
      });
    });
    els.copyLinkBtn.addEventListener("click", () => copyText(els.permalinkInput.value));
    els.copyIdsBtn.addEventListener("click", () => copyText(buildExportText()));
    els.downloadIdsBtn.addEventListener("click", downloadIds);
    els.exportImageBtn.addEventListener("click", exportImage);
    els.copyDialogBtn.addEventListener("click", () => copyText(els.dialogExportText.value));
    els.applyImportBtn.addEventListener("click", () => {
      importDeckText(els.importText.value);
    });
    els.closePreviewBtn.addEventListener("click", closeCardPreview);
    els.cardPreviewDialog.addEventListener("click", (event) => {
      if (event.target === els.cardPreviewDialog) closeCardPreview();
    });
  }

  function render() {
    els.catalogSummary.textContent = "";
    els.deckNameInput.value = state.deckName;
    els.deckAuthorInput.value = formatAuthorLine();
    els.exportDeckNameInput.value = state.deckName;
    els.authorInput.value = state.author;
    setActiveTab(state.activeTab);
    renderCatalog();
    renderDeck();
    renderExport();
    renderDeckView();
  }

  function updateAuthor(value, normalize, source) {
    state.author = normalizeAuthor(value) || "anonymous";
    if (normalize) {
      els.deckAuthorInput.value = formatAuthorLine();
      els.authorInput.value = state.author;
    } else if (source === "builder") {
      els.authorInput.value = state.author;
    } else if (source === "export") {
      els.deckAuthorInput.value = formatAuthorLine();
    }
    localStorage.setItem(AUTHOR_KEY, state.author);
    renderExport();
    renderDeckView();
  }

  function setActiveTab(tabName) {
    state.activeTab = tabName;
    els.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });
    els.tabPages.forEach((page) => {
      page.classList.toggle("active", page.dataset.page === tabName);
    });
  }

  function updateDeckName(value, normalize, source) {
    const nextName = normalize ? (value.trim() || "Untitled Deck") : value;
    state.deckName = nextName.trim() || "Untitled Deck";
    if (normalize) {
      els.deckNameInput.value = state.deckName;
      els.exportDeckNameInput.value = state.deckName;
    } else if (source === "builder") {
      els.exportDeckNameInput.value = state.deckName;
    } else if (source === "export") {
      els.deckNameInput.value = state.deckName;
    }
    saveDeck();
    renderExport();
    renderDeckView();
  }

  function renderCatalog() {
    const filtered = cards.filter(matchesFilters).sort(sortCards);
    const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.pageCount = pageCount;
    state.page = Math.min(Math.max(1, state.page), pageCount);
    const start = (state.page - 1) * state.pageSize;
    const pageCards = filtered.slice(start, start + state.pageSize);

    els.resultsCount.textContent = `${filtered.length} card${filtered.length === 1 ? "" : "s"}`;
    renderPageInfo();
    els.prevPageBtn.disabled = state.page === 1;
    els.nextPageBtn.disabled = state.page === pageCount;

    const fragment = document.createDocumentFragment();
    pageCards.forEach((card) => fragment.appendChild(renderCardTile(card)));
    els.cardGrid.replaceChildren(fragment);
  }

  function renderPageInfo() {
    if (!state.isEditingPage) {
      els.pageInfo.textContent = `${state.page}/${state.pageCount}`;
    }
  }

  function startPageEdit() {
    if (state.isEditingPage) return;
    state.isEditingPage = true;
    const input = document.createElement("input");
    input.className = "page-jump-input";
    input.type = "number";
    input.min = "1";
    input.max = String(state.pageCount);
    input.value = String(state.page);
    input.setAttribute("aria-label", "Page number");

    const finish = (commit) => {
      if (!state.isEditingPage) return;
      if (commit) {
        const nextPage = Number(input.value);
        if (Number.isFinite(nextPage)) {
          state.page = Math.min(state.pageCount, Math.max(1, Math.trunc(nextPage)));
        }
      }
      state.isEditingPage = false;
      els.pageInfo.replaceChildren();
      renderCatalog();
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(true);
      if (event.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));

    els.pageInfo.replaceChildren(input);
    input.focus();
    input.select();
  }

  function matchesFilters(card) {
    const haystack = `${card.id} ${card.exportId} ${card.name} ${card.setCode} ${card.set} ${getSetSearchAliases(card)} ${card.rarity} ${card.rarityName} ${card.type} ${card.archetypes.join(" ")} ${card.subtypes.join(" ")}`.toLowerCase();
    const cost = card.cost ?? UNKNOWN;
    return (!state.filters.search || haystack.includes(state.filters.search))
      && matchesMulti("cost", String(cost))
      && matchesMulti("rarity", card.rarity)
      && matchesMulti("type", card.type)
      && matchesMulti("set", card.set)
      && matchesAnyMulti("archetype", card.archetypes);
  }

  function matchesMulti(key, value) {
    return state.filters[key].size === 0 || state.filters[key].has(String(value));
  }

  function matchesAnyMulti(key, values) {
    return state.filters[key].size === 0 || values.some((value) => state.filters[key].has(String(value)));
  }

  function sortCards(a, b) {
    if (state.filters.sort === "cost") {
      return compareCosts(a.cost ?? UNKNOWN, b.cost ?? UNKNOWN) || compareText(a.id, b.id);
    }
    if (state.filters.sort === "rarity") {
      return compareText(a.rarity, b.rarity) || compareText(a.id, b.id);
    }
    if (state.filters.sort === "set") {
      return compareText(a.set, b.set) || compareText(a.setCode, b.setCode) || compareText(a.id, b.id);
    }
    if (state.filters.sort === "type") {
      return compareText(a.type, b.type) || compareText(a.id, b.id);
    }
    return compareText(a.name, b.name) || compareText(a.exportId, b.exportId) || compareText(a.id, b.id);
  }

  function renderCardTile(card) {
    const tile = document.createElement("article");
    tile.className = "card-tile";
    tile.dataset.cardId = card.id;

    const image = document.createElement("img");
    image.loading = "lazy";
    image.alt = card.id;
    image.src = card.imageSrc;
    image.addEventListener("click", () => showCardPreview(card));

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const canAdd = canAddCard(card);
    meta.innerHTML = `
      <div class="qty-controls catalog-qty" aria-label="${escapeAttr(card.id)} catalog quantity controls">
        <button type="button" data-remove="${escapeAttr(card.id)}">-</button>
        <span>${state.deck.get(card.id) || 0}</span>
        <button type="button" data-add="${escapeAttr(card.id)}" ${canAdd ? "" : "disabled"} title="${escapeAttr(limitMessage(card))}">+</button>
      </div>
    `;

    meta.querySelector("[data-add]").addEventListener("click", () => updateDeck(card.id, 1));
    meta.querySelector("[data-remove]").addEventListener("click", () => updateDeck(card.id, -1));
    tile.append(image, meta);
    return tile;
  }

  function renderDeck() {
    const entries = getDeckEntries();
    const total = entries.reduce((sum, entry) => sum + entry.qty, 0);
    const mainDeckTotal = entries
      .filter((entry) => MAIN_DECK_TYPES.has(entry.card.type))
      .reduce((sum, entry) => sum + entry.qty, 0);
    els.deckCount.textContent = String(total);
    els.mainDeckCount.textContent = String(mainDeckTotal);

    if (!entries.length) {
      els.deckList.classList.add("is-empty");
      els.deckList.innerHTML = '<div class="empty-state">Add cards from the catalog to begin.</div>';
      return;
    }

    els.deckList.classList.remove("is-empty");
    const fragment = document.createDocumentFragment();
    groupedDeckEntries(entries).forEach((group) => {
      const section = document.createElement("section");
      section.className = `deck-section deck-section-${slugify(group.type)}`;
      section.innerHTML = `
        <div class="deck-section-header">
          <strong>${escapeHtml(DECK_TYPE_LABELS[group.type] || toTitle(group.type))}</strong>
          <span>${group.total}</span>
        </div>
      `;

      group.entries.forEach(({ card, qty }) => section.appendChild(renderDeckRow(card, qty)));
      fragment.appendChild(section);
    });
    els.deckList.replaceChildren(fragment);
  }

  function renderDeckRow(card, qty) {
    const row = document.createElement("div");
    row.className = "deck-row";
    row.dataset.deckId = card.id;
    const canAdd = canAddCard(card);
    const costValue = card.cost ?? "";
    row.innerHTML = `
      <img src="${escapeAttr(card.imageSrc)}" alt="${escapeAttr(card.id)}">
      <div class="deck-card-text">
        <div class="deck-name-line">
          <strong>${escapeHtml(card.name)}</strong>
          <span class="deck-cost-gem ${costValue === "" ? "is-empty" : ""}">${escapeHtml(costValue)}</span>
        </div>
        ${renderDeckSubtitle(card)}
      </div>
      <div class="deck-qty" aria-label="${escapeAttr(card.id)} quantity controls">
        <span class="deck-qty-count">x${qty}</span>
        <div class="deck-qty-buttons">
          <button type="button" data-inc="${escapeAttr(card.id)}" ${canAdd ? "" : "disabled"} title="${escapeAttr(limitMessage(card))}">+</button>
          <button type="button" data-dec="${escapeAttr(card.id)}">-</button>
        </div>
      </div>
    `;
    row.querySelector("img").addEventListener("click", () => showCardPreview(card));
    row.querySelector("[data-dec]").addEventListener("click", () => updateDeck(card.id, -1));
    row.querySelector("[data-inc]").addEventListener("click", () => updateDeck(card.id, 1));
    return row;
  }

  function updateDeck(id, delta) {
    const card = cardById.get(id);
    if (!card) return;
    if (delta > 0 && !canAddCard(card)) return;

    const nextQty = (state.deck.get(id) || 0) + delta;
    if (nextQty <= 0) {
      state.deck.delete(id);
    } else {
      state.deck.set(id, nextQty);
    }
    saveDeck();
    renderDeck();
    renderCatalog();
    renderExport();
    renderDeckView();
  }

  function getDeckEntries() {
    return [...state.deck.entries()]
      .map(([id, qty]) => ({ card: cardById.get(id), qty }))
      .filter((entry) => entry.card)
      .sort((a, b) => sortDeckEntries(a, b));
  }

  function groupedDeckEntries(entries) {
    return DECK_TYPE_ORDER.map((type) => {
      const typeEntries = entries.filter((entry) => entry.card.type === type);
      return {
        type,
        entries: typeEntries,
        total: typeEntries.reduce((sum, entry) => sum + entry.qty, 0),
      };
    }).filter((group) => group.entries.length > 0);
  }

  function canAddCard(card) {
    const currentQty = state.deck.get(card.id) || 0;
    if (currentQty >= maxCopiesForCard(card)) return false;
    if (card.type === "main character" && deckTypeCount("main character") >= 1) return false;
    if (card.type === "scene" && deckTypeCount("scene") >= 15) return false;
    if (card.type === "story" && currentQty >= 1) return false;
    if (card.type === "story" && deckUniqueTypeCount("story") >= 4 && currentQty === 0) return false;
    return true;
  }

  function maxCopiesForCard(card) {
    if (card.type === "main character") return 1;
    if (card.type === "story") return 1;
    if (card.type === "scene") return 15;
    return 4;
  }

  function deckTypeCount(type) {
    return getDeckEntries()
      .filter((entry) => entry.card.type === type)
      .reduce((sum, entry) => sum + entry.qty, 0);
  }

  function deckUniqueTypeCount(type) {
    return getDeckEntries().filter((entry) => entry.card.type === type).length;
  }

  function limitMessage(card) {
    if (canAddCard(card)) return "Add card";
    if (card.type === "main character") return "Deck can only include 1 main character.";
    if (card.type === "scene") return "Deck can only include 15 scene cards.";
    if (card.type === "story") return "Deck can only include 4 unique story cards, 1 copy each.";
    return "Deck can only include 4 copies of this card.";
  }

  function renderDeckSubtitle(card) {
    return `<span>${escapeHtml(card.id)}</span>`;
  }

  function renderExport() {
    els.permalinkInput.value = buildPermalink();
    els.exportText.value = buildExportText();
    els.exportFormatButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.exportFormat === state.exportFormat);
    });
  }

  function renderDeckView() {
    const entries = getDeckEntries();
    els.deckViewName.textContent = state.deckName;
    els.deckViewAuthor.textContent = state.author ? `by ${state.author}` : "";

    if (!entries.length) {
      els.deckImageGrid.innerHTML = '<div class="deck-view-empty">Add cards from the deckbuilder to view them here.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    DECK_VIEW_PILES.forEach((pile) => {
      const pileEntries = entries.filter((entry) => pile.types.includes(entry.card.type));
      if (!pileEntries.length) return;

      const section = document.createElement("section");
      section.className = `deck-view-pile deck-view-pile-${pile.key}`;
      const total = pileEntries.reduce((sum, entry) => sum + entry.qty, 0);
      section.innerHTML = `
        <div class="deck-view-section-title">
          <strong>${escapeHtml(pile.label)}</strong>
          <span>${total}</span>
        </div>
        <div class="deck-view-pile-grid"></div>
      `;

      const grid = section.querySelector(".deck-view-pile-grid");
      pileEntries.forEach(({ card, qty }) => {
        const tile = document.createElement("article");
        tile.className = "deck-view-card";
        tile.innerHTML = `
          <img src="${escapeAttr(card.imageSrc)}" alt="${escapeAttr(card.id)}">
          <span>${qty}</span>
        `;
        tile.querySelector("img").addEventListener("click", () => showCardPreview(card));
        grid.appendChild(tile);
      });
      fragment.appendChild(section);
    });
    els.deckImageGrid.replaceChildren(fragment);
  }

  function sortDeckEntries(a, b) {
    return compareCosts(a.card.cost ?? UNKNOWN, b.card.cost ?? UNKNOWN)
      || compareText(a.card.set, b.card.set)
      || compareText(a.card.setCode, b.card.setCode)
      || compareText(a.card.exportId, b.card.exportId);
  }

  function buildIdList() {
    return getDeckEntries()
      .flatMap(({ card, qty }) => Array.from({ length: qty }, () => card.id))
      .join("\n");
  }

  function buildExportText() {
    if (state.exportFormat === "tts") {
      return getDeckEntries()
        .map(({ card, qty }) => `${qty} ${card.exportId}`)
        .join("\n");
    }
    const entries = getDeckEntries();
    const sections = DECK_VIEW_PILES.flatMap((pile) => {
      const pileEntries = entries.filter((entry) => pile.types.includes(entry.card.type));
      if (!pileEntries.length) return [];
      const lines = pileEntries.map(({ card, qty }) => `${qty}x ${card.id}: ${card.name}`);
      return [`=== ${pile.label} ===`, ...lines, ""];
    });
    return sections.join("\n").trim();
  }

  async function importFromClipboard() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      openImportDialog("");
      return;
    }

    if (!text.trim()) {
      openImportDialog("");
      return;
    }
    importDeckText(text);
  }

  function importDeckText(text) {
    const imported = parseDeckText(text);
    if (!imported.size) {
      openImportDialog(text);
      return;
    }

    state.deck.clear();
    imported.forEach((qty, id) => {
      const card = cardById.get(id);
      for (let index = 0; index < qty; index += 1) {
        if (!card || !canAddCard(card)) break;
        state.deck.set(id, (state.deck.get(id) || 0) + 1);
      }
    });

    saveDeck();
    renderDeck();
    renderCatalog();
    renderExport();
    renderDeckView();
    if (els.importDialog.open) els.importDialog.close();
    const total = [...state.deck.values()].reduce((sum, qty) => sum + qty, 0);
    showText("Import Complete", `Imported ${total} cards.`);
  }

  function openImportDialog(text) {
    els.importText.value = text || "";
    els.importText.placeholder = "Paste a deck export here";
    els.importDialog.showModal();
    els.importText.focus();
  }

  function parseDeckText(text) {
    const imported = new Map();
    String(text || "").split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("===")) return;

      const match = line.match(/^(?:(\d+)\s*x?\s*)?([※A-Za-z0-9-]+)(?::.*)?$/i);
      if (!match) return;

      const qty = Math.max(1, Number(match[1] || 1));
      const id = resolveCardId(match[2]);
      if (!id) return;
      imported.set(id, (imported.get(id) || 0) + qty);
    });
    return imported;
  }

  function resolveCardId(value) {
    const id = String(value || "").trim();
    if (cardById.has(id)) return id;
    const normalized = id.replace(/^※/, "");
    const match = cards.find((card) => card.exportId === normalized || card.id.replace(/^※/, "") === normalized);
    return match?.id || null;
  }

  function buildPermalink() {
    const payload = toBase64(JSON.stringify({
      name: state.deckName,
      author: state.author,
      deck: Object.fromEntries(state.deck),
    }));
    return `${location.origin}${location.pathname}?deck=${encodeURIComponent(payload)}`;
  }

  function showTextExport() {
    els.dialogTitle.textContent = "Deck ID Export";
    els.dialogExportText.value = buildIdList();
    els.exportDialog.showModal();
  }

  function downloadIds() {
    const blob = new Blob([buildExportText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(state.deckName)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showExportStatus("Downloaded .txt");
  }

  async function exportImage() {
    const entries = getDeckEntries();
    if (!entries.length) {
      showText("Deck Image Export", "Add at least one card before exporting an image.");
      return;
    }

    const width = 1500;
    const margin = 24;
    const titleH = 82;
    const cardW = 150;
    const cardH = 210;
    const colGap = 29;
    const rowGap = 24;
    const sectionGap = 28;
    const sectionHeaderH = 44;
    const sectionHeaderW = 180;
    const columns = 8;
    const piles = DECK_VIEW_PILES.map((pile) => {
      const pileEntries = entries.filter((entry) => pile.types.includes(entry.card.type));
      return {
        ...pile,
        entries: pileEntries,
        total: pileEntries.reduce((sum, entry) => sum + entry.qty, 0),
        rows: Math.max(1, Math.ceil(pileEntries.length / columns)),
      };
    }).filter((pile) => pile.entries.length);
    const boardH = margin
      + piles.reduce((sum, pile) => sum + sectionHeaderH + 18 + pile.rows * cardH + (pile.rows - 1) * rowGap + sectionGap, 0);
    const height = margin + titleH + 14 + boardH + margin;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#080111";
    ctx.fillRect(0, 0, width, height);

    const titleX = margin;
    const titleY = margin;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(titleX, titleY, width - margin * 2, titleH);
    ctx.fillStyle = "#07090d";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.fillText(state.deckName, width / 2, titleY + 12);
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(`by ${state.author || "anonymous"}`, width / 2, titleY + 48);

    const boardX = margin;
    const boardY = titleY + titleH + 14;
    ctx.fillStyle = "rgba(8, 10, 12, 0.96)";
    ctx.fillRect(boardX, boardY, width - margin * 2, boardH);

    await Promise.all(entries.map(({ card }) => preload(card.imageSrc)));

    let y = boardY + margin;
    piles.forEach((pile) => {
      ctx.fillStyle = "#2c246d";
      ctx.fillRect(boardX, y, sectionHeaderW, sectionHeaderH);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "900 18px system-ui, sans-serif";
      ctx.fillText(pile.label, boardX + 18, y + sectionHeaderH / 2);
      ctx.textAlign = "right";
      ctx.fillText(String(pile.total), boardX + sectionHeaderW - 18, y + sectionHeaderH / 2);

      const gridY = y + sectionHeaderH + 18;
      pile.entries.forEach(({ card, qty }, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = boardX + margin + col * (cardW + colGap);
        const cardY = gridY + row * (cardH + rowGap);
        const image = imageCache.get(card.imageSrc);
        ctx.drawImage(image, x, cardY, cardW, cardH);

        ctx.beginPath();
        ctx.arc(x + cardW / 2, cardY + cardH - 18, 19, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "950 25px system-ui, sans-serif";
        ctx.fillText(String(qty), x + cardW / 2, cardY + cardH - 18);
      });

      y += sectionHeaderH + 18 + pile.rows * cardH + (pile.rows - 1) * rowGap + sectionGap;
    });

    const link = document.createElement("a");
    link.download = `${slugify(state.deckName)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const imageCache = new Map();

  function preload(src) {
    if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        imageCache.set(src, image);
        resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function showText(title, text) {
    els.dialogTitle.textContent = title;
    els.dialogExportText.value = text;
    els.exportDialog.showModal();
  }

  function showCardPreview(card) {
    els.previewImage.src = card.imageSrc;
    els.previewImage.alt = card.id;
    els.cardPreviewDialog.showModal();
  }

  function closeCardPreview() {
    els.cardPreviewDialog.close();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showExportStatus("Copied");
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      textarea.remove();
      if (copied) {
        showExportStatus("Copied");
      } else {
        showText("Copy Text", text);
        requestAnimationFrame(() => {
          els.dialogExportText.focus();
          els.dialogExportText.select();
        });
        showExportStatus("Copy text opened");
      }
      return copied;
    }
  }

  function showExportStatus(message) {
    if (!els.exportStatus) return;
    els.exportStatus.textContent = message;
    clearTimeout(showExportStatus.timer);
    showExportStatus.timer = setTimeout(() => {
      els.exportStatus.textContent = "";
    }, 2200);
  }

  function loadDeck() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.deckName = saved.deckName || state.deckName;
      state.deck = new Map(Object.entries(saved.deck || {}).filter(([, qty]) => Number(qty) > 0));
      state.author = normalizeAuthor(localStorage.getItem(AUTHOR_KEY) || state.author) || "anonymous";
    } catch {
      state.deck = new Map();
      state.author = "anonymous";
    }
  }

  function loadCardMetadata() {
    try {
      return JSON.parse(localStorage.getItem(METADATA_KEY) || "{}").cards || {};
    } catch {
      return {};
    }
  }

  function saveDeck() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      deckName: state.deckName,
      deck: Object.fromEntries(state.deck),
    }));
  }

  function unique(values, compare) {
    return [...new Set(values)].sort(compare);
  }

  function compareCosts(a, b) {
    if (a === UNKNOWN && b !== UNKNOWN) return 1;
    if (b === UNKNOWN && a !== UNKNOWN) return -1;
    return Number(a) - Number(b) || compareText(String(a), String(b));
  }

  function compareText(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  }

  function slugify(value) {
    return (value || "deck").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "deck";
  }

  function toTitle(value) {
    return String(value).replace(/\b\w/g, (char) => char.toUpperCase());
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

  function normalizeAuthor(value) {
    return String(value || "").trim().replace(/^by\s+/i, "").trim();
  }

  function formatAuthorLine() {
    return `by ${state.author || "anonymous"}`;
  }

  function getSetName(setCode) {
    return SET_NAMES[setCode] || setCode || UNKNOWN;
  }

  function getSetSearchAliases(card) {
    if (card.setCode.startsWith("SD")) return "starter deck starter starters";
    if (card.setCode.startsWith("BP")) return "main set booster pack booster";
    if (card.setCode === "PR") return "promo promotional";
    return "";
  }

  function toBase64(value) {
    return btoa(unescape(encodeURIComponent(value)));
  }
})();
