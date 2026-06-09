(function () {
  const STORAGE_KEY = "mlpdb.deck.v1";
  const AUTHOR_KEY = "mlpdb.author.v1";
  const ACCOUNTS_KEY = "mlpdb.accounts.v1";
  const SESSION_KEY = "mlpdb.session.v1";
  const SAVED_DECKS_PREFIX = "mlpdb.savedDecks.v1.";
  const SUPABASE_URL = "https://tonyuhbwyhyklsfdbfgo.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbnl1aGJ3eWh5a2xzZmRiZmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTE1NzEsImV4cCI6MjA5NjUyNzU3MX0.NblrGiy3CbMJvKob40kVMnPo8yafCfQjeG6WeFS-0ks";
  const UNKNOWN = "Unknown";
  const BASE_WIDTH = 1500;
  const BASE_HEIGHT = 1320;
  const METADATA_KEY = "mlpdb.metadata.v1";
  const MAX_SAVED_DECKS = 24;
  const SAVED_DECKS_PAGE_SIZE = 12;
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
    "main deck": "Main Deck",
    "main character": "Main Character",
    character: "Character",
    event: "Event",
    item: "Item",
    story: "Story",
    scene: "Scene",
  };
  const MAIN_DECK_TYPES = new Set(["character", "event", "item"]);
  const DECK_VIEW_PILES = [
    { key: "main-deck", label: "Main Deck", types: ["character", "event", "item"], includeUnknown: true },
    { key: "main-character", label: "Main Character", types: ["main character"] },
    { key: "story", label: "Story Deck", types: ["story"] },
    { key: "scene", label: "Scene Deck", types: ["scene"] },
  ];
  const SORT_OPTIONS = [
    { value: "id", label: "Card ID" },
    { value: "cost", label: "Cost" },
    { value: "rarity", label: "Rarity" },
    { value: "set", label: "Set" },
    { value: "type", label: "Type" },
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
    authMode: "login",
    currentUser: null,
    currentUserId: null,
    currentProfile: null,
    selectedSavedDeckId: null,
    savedDecksPage: 1,
    savedDecks: [],
    deck: new Map(),
    filters: {
      search: "",
      cost: new Set(),
      rarity: new Set(),
      type: new Set(),
      set: new Set(),
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
  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : createRestSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const els = {
    appFrame: document.getElementById("appFrame"),
    appShell: document.getElementById("appShell"),
    accountArea: document.getElementById("accountArea"),
    loginBtn: document.getElementById("loginBtn"),
    createAccountBtn: document.getElementById("createAccountBtn"),
    userMenu: document.getElementById("userMenu"),
    userMenuBtn: document.getElementById("userMenuBtn"),
    userMenuPanel: document.getElementById("userMenuPanel"),
    logoutBtn: document.getElementById("logoutBtn"),
    deleteAccountBtn: document.getElementById("deleteAccountBtn"),
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
    sortFilter: document.getElementById("sortFilter"),
    sortFilterButton: document.getElementById("sortFilterButton"),
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
    saveDeckBtn: document.getElementById("saveDeckBtn"),
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
    yourDecksSummary: document.getElementById("yourDecksSummary"),
    savedDecksList: document.getElementById("savedDecksList"),
    savedDecksPagination: document.getElementById("savedDecksPagination"),
    savedDecksPrevBtn: document.getElementById("savedDecksPrevBtn"),
    savedDecksNextBtn: document.getElementById("savedDecksNextBtn"),
    savedDecksPageInfo: document.getElementById("savedDecksPageInfo"),
    exportDialog: document.getElementById("exportDialog"),
    dialogTitle: document.getElementById("dialogTitle"),
    exportText: document.getElementById("exportText"),
    dialogExportText: document.getElementById("dialogExportText"),
    copyDialogBtn: document.getElementById("copyDialogBtn"),
    importDialog: document.getElementById("importDialog"),
    importText: document.getElementById("importText"),
    applyImportBtn: document.getElementById("applyImportBtn"),
    saveDeckDialog: document.getElementById("saveDeckDialog"),
    saveDeckNameInput: document.getElementById("saveDeckNameInput"),
    saveDeckAuthorInput: document.getElementById("saveDeckAuthorInput"),
    saveDeckStatus: document.getElementById("saveDeckStatus"),
    confirmSaveDeckBtn: document.getElementById("confirmSaveDeckBtn"),
    authDialog: document.getElementById("authDialog"),
    authDialogTitle: document.getElementById("authDialogTitle"),
    authUsernameLabel: document.getElementById("authUsernameLabel"),
    authUsernameInput: document.getElementById("authUsernameInput"),
    authEmailInput: document.getElementById("authEmailInput"),
    authPasswordInput: document.getElementById("authPasswordInput"),
    authStatus: document.getElementById("authStatus"),
    authSubmitBtn: document.getElementById("authSubmitBtn"),
    savedDeckDialog: document.getElementById("savedDeckDialog"),
    savedDeckDialogTitle: document.getElementById("savedDeckDialogTitle"),
    savedDeckDialogMeta: document.getElementById("savedDeckDialogMeta"),
    deleteSavedDeckBtn: document.getElementById("deleteSavedDeckBtn"),
    loadSavedDeckBtn: document.getElementById("loadSavedDeckBtn"),
    cardPreviewDialog: document.getElementById("cardPreviewDialog"),
    previewImage: document.getElementById("previewImage"),
    closePreviewBtn: document.getElementById("closePreviewBtn"),
  };

  loadDeck();
  setupViewportScale();
  hydrateFilters();
  bindEvents();
  render();
  initializeAuth();

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
    fillSortFilter();
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

  function fillSortFilter() {
    els.sortFilter.replaceChildren();
    els.sortFilterButton.addEventListener("click", () => toggleFilterMenu("sort"));
    SORT_OPTIONS.forEach((option) => {
      const button = document.createElement("button");
      button.className = "filter-option sort-option";
      button.type = "button";
      button.dataset.sortValue = option.value;
      button.textContent = option.label;
      button.addEventListener("click", () => {
        state.filters.sort = option.value;
        state.page = 1;
        els.sortFilter.classList.remove("open");
        updateSortButton();
        renderCatalog();
      });
      els.sortFilter.append(button);
    });
    updateSortButton();
  }

  function updateSortButton() {
    const option = SORT_OPTIONS.find((item) => item.value === state.filters.sort) || SORT_OPTIONS[0];
    els.sortFilterButton.textContent = `Sort: ${option.label}`;
    els.sortFilter.querySelectorAll(".sort-option").forEach((button) => {
      button.classList.toggle("selected", button.dataset.sortValue === state.filters.sort);
    });
  }

  function bindEvents() {
    els.loginBtn.addEventListener("click", () => openAuthDialog("login"));
    els.createAccountBtn.addEventListener("click", () => openAuthDialog("create"));
    els.authSubmitBtn.addEventListener("click", submitAuth);
    els.authPasswordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submitAuth();
    });
    els.authUsernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") els.authEmailInput.focus();
    });
    els.authEmailInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") els.authPasswordInput.focus();
    });
    els.userMenuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleUserMenu();
    });
    els.logoutBtn.addEventListener("click", logout);
    els.deleteAccountBtn.addEventListener("click", deleteAccount);
    document.addEventListener("click", (event) => {
      if (!event.target.closest("#userMenu")) closeUserMenu();
    });

    els.tabButtons.forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    });

    els.searchInput.addEventListener("input", () => {
      state.filters.search = els.searchInput.value.trim().toLowerCase();
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
        sort: "id",
      };
      els.searchInput.value = "";
      clearMultiFilter("cost", "Cost");
      clearMultiFilter("rarity", "Rarity");
      clearMultiFilter("type", "Type");
      clearMultiFilter("set", "Set");
      updateSortButton();
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
        resetDeck();
      }
    });
    els.importClipboardBtn.addEventListener("click", importFromClipboard);
    els.saveDeckBtn.addEventListener("click", openSaveDeckDialog);
    els.confirmSaveDeckBtn.addEventListener("click", saveCurrentDeckToLibrary);
    els.saveDeckNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") saveCurrentDeckToLibrary();
    });
    els.saveDeckAuthorInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") saveCurrentDeckToLibrary();
    });
    els.savedDecksPrevBtn.addEventListener("click", () => {
      state.savedDecksPage = Math.max(1, state.savedDecksPage - 1);
      renderYourDecks();
    });
    els.savedDecksNextBtn.addEventListener("click", () => {
      state.savedDecksPage += 1;
      renderYourDecks();
    });
    els.loadSavedDeckBtn.addEventListener("click", loadSelectedSavedDeck);
    els.deleteSavedDeckBtn.addEventListener("click", deleteSelectedSavedDeck);

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
    renderAccount();
    renderYourDecks();
  }

  async function initializeAuth() {
    if (!supabaseClient) {
      loadSession();
      renderAccount();
      renderYourDecks();
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (!error && data.session?.user) {
      await setSupabaseUser(data.session.user);
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await setSupabaseUser(session.user);
      } else {
        state.currentUser = null;
        state.currentUserId = null;
        state.currentProfile = null;
        state.savedDecks = [];
        renderAccount();
        renderYourDecks();
      }
    });
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
    if (tabName === "your-decks") renderYourDecks();
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

  function resetDeck() {
    state.deck.clear();
    state.deckName = "Untitled Deck";
    state.author = "anonymous";
    els.deckNameInput.value = state.deckName;
    els.deckAuthorInput.value = formatAuthorLine();
    els.exportDeckNameInput.value = state.deckName;
    els.authorInput.value = state.author;
    localStorage.setItem(AUTHOR_KEY, state.author);
    saveDeck();
    renderDeck();
    renderCatalog();
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
    const haystack = `${card.id} ${card.exportId} ${card.name} ${card.setCode} ${card.set} ${getSetSearchAliases(card)} ${card.rarity} ${card.rarityName} ${card.type} ${card.subtypes.join(" ")}`.toLowerCase();
    const cost = card.cost ?? UNKNOWN;
    return (!state.filters.search || haystack.includes(state.filters.search))
      && matchesMulti("cost", String(cost))
      && matchesMulti("rarity", card.rarity)
      && matchesMulti("type", card.type)
      && matchesMulti("set", card.set);
  }

  function matchesMulti(key, value) {
    return state.filters[key].size === 0 || state.filters[key].has(String(value));
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
    const currentQty = state.deck.get(card.id) || 0;
    meta.innerHTML = `
      <div class="qty-controls catalog-qty ${currentQty > 0 ? "has-copies" : ""}" aria-label="${escapeAttr(card.id)} catalog quantity controls">
        <button type="button" data-remove="${escapeAttr(card.id)}">-</button>
        <button class="catalog-qty-count" type="button" data-toggle-max="${escapeAttr(card.id)}" title="${currentQty > 0 ? "Remove all copies" : "Add max copies"}">${currentQty}</button>
        <button type="button" data-add="${escapeAttr(card.id)}" ${canAdd ? "" : "disabled"} title="${escapeAttr(limitMessage(card))}">+</button>
      </div>
    `;

    meta.querySelector("[data-add]").addEventListener("click", () => updateDeck(card.id, 1));
    meta.querySelector("[data-remove]").addEventListener("click", () => updateDeck(card.id, -1));
    meta.querySelector("[data-toggle-max]").addEventListener("click", () => toggleMaxCopies(card));
    tile.append(image, meta);
    return tile;
  }

  function renderDeck() {
    const entries = getDeckEntries();
    const total = entries.reduce((sum, entry) => sum + entry.qty, 0);
    const mainDeckTotal = entries
      .filter((entry) => isMainDeckCard(entry.card))
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
    const scrollPosition = getScrollPosition();

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
    restoreScrollPosition(scrollPosition);
  }

  function toggleMaxCopies(card) {
    const scrollPosition = getScrollPosition();
    if ((state.deck.get(card.id) || 0) > 0) {
      state.deck.delete(card.id);
    } else {
      while (canAddCard(card)) {
        state.deck.set(card.id, (state.deck.get(card.id) || 0) + 1);
      }
    }
    saveDeck();
    renderDeck();
    renderCatalog();
    renderExport();
    renderDeckView();
    restoreScrollPosition(scrollPosition);
  }

  function getScrollPosition() {
    const scroller = document.scrollingElement || document.documentElement || document.body;
    return {
      windowX: window.scrollX,
      windowY: window.scrollY,
      element: scroller,
      elementX: scroller?.scrollLeft || 0,
      elementY: scroller?.scrollTop || 0,
    };
  }

  function restoreScrollPosition(position) {
    window.scrollTo(position.windowX, position.windowY);
    if (position.element) {
      position.element.scrollLeft = position.elementX;
      position.element.scrollTop = position.elementY;
    }
  }

  function getDeckEntries() {
    return [...state.deck.entries()]
      .map(([id, qty]) => ({ card: cardById.get(id), qty }))
      .filter((entry) => entry.card)
      .sort((a, b) => sortDeckEntries(a, b));
  }

  function groupedDeckEntries(entries) {
    const groups = DECK_TYPE_ORDER.map((type) => {
      const typeEntries = entries.filter((entry) => entry.card.type === type);
      return {
        type,
        entries: typeEntries,
        total: typeEntries.reduce((sum, entry) => sum + entry.qty, 0),
      };
    }).filter((group) => group.entries.length > 0);

    const unknownEntries = entries.filter((entry) => !DECK_TYPE_ORDER.includes(entry.card.type));
    if (unknownEntries.length) {
      groups.unshift({
        type: "main deck",
        entries: unknownEntries,
        total: unknownEntries.reduce((sum, entry) => sum + entry.qty, 0),
      });
    }

    return groups;
  }

  function isMainDeckCard(card) {
    return MAIN_DECK_TYPES.has(card.type) || !DECK_TYPE_ORDER.includes(card.type);
  }

  function pileMatchesCard(pile, card) {
    if (pile.includeUnknown && isMainDeckCard(card)) return true;
    return pile.types.includes(card.type);
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
    const sidePileRow = document.createElement("div");
    sidePileRow.className = "deck-view-side-piles";
    DECK_VIEW_PILES.forEach((pile) => {
      const pileEntries = entries.filter((entry) => pileMatchesCard(pile, entry.card));
      if (!pileEntries.length) return;

      const section = document.createElement("section");
      section.className = `deck-view-pile deck-view-pile-${pile.key}`;
      section.style.setProperty("--pile-columns", String(deckViewPileColumns(pile, pileEntries.length)));
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

      if (pile.key === "main-deck") {
        fragment.appendChild(section);
      } else {
        sidePileRow.appendChild(section);
      }
    });
    if (sidePileRow.children.length) fragment.appendChild(sidePileRow);
    els.deckImageGrid.replaceChildren(fragment);
  }

  function deckViewPileColumns(pile, entryCount) {
    if (pile.key === "main-deck") return 8;
    if (pile.key === "story") return Math.min(4, Math.max(1, entryCount));
    if (pile.key === "scene") return Math.min(3, Math.max(1, entryCount));
    return 1;
  }

  async function setSupabaseUser(user) {
    state.currentUser = normalizeEmail(user.email);
    state.currentUserId = user.id;
    state.currentProfile = await loadSupabaseProfile(user);
    await loadSupabaseDecks();
    renderAccount();
    renderYourDecks();
  }

  async function loadSupabaseProfile(user) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.username) return data;

    const username = normalizeUsername(user.user_metadata?.username) || normalizeEmail(user.email).split("@")[0];
    const { data: inserted } = await supabaseClient
      .from("profiles")
      .upsert({ user_id: user.id, username }, { onConflict: "user_id" })
      .select("username")
      .maybeSingle();
    return inserted || { username };
  }

  async function loadSupabaseDecks() {
    if (!supabaseClient || !state.currentUserId) return;
    const { data, error } = await supabaseClient
      .from("decks")
      .select("id,name,author,cards,preview_card_id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(MAX_SAVED_DECKS);

    if (error) {
      state.savedDecks = [];
      showExportStatus("Could not load saved decks");
      return;
    }

    state.savedDecks = (data || []).map((deck) => ({
      id: deck.id,
      name: deck.name,
      author: deck.author,
      cards: deck.cards || {},
      previewCardId: deck.preview_card_id,
      savedAt: deck.updated_at,
    }));
  }

  function renderAccount() {
    const isLoggedIn = Boolean(state.currentUser);
    els.loginBtn.hidden = isLoggedIn;
    els.createAccountBtn.hidden = isLoggedIn;
    els.userMenu.hidden = !isLoggedIn;
    if (isLoggedIn) {
      els.userMenuBtn.textContent = getCurrentUsername();
    }
  }

  function renderYourDecks() {
    if (!state.currentUser) {
      els.yourDecksSummary.textContent = "Login to view saved decks.";
      els.savedDecksList.innerHTML = '<div class="empty-state">No account is logged in.</div>';
      els.savedDecksPagination.hidden = true;
      return;
    }

    const decks = getSavedDecks();
    const totalPages = Math.max(1, Math.ceil(decks.length / SAVED_DECKS_PAGE_SIZE));
    state.savedDecksPage = Math.min(Math.max(1, state.savedDecksPage), totalPages);
    const start = (state.savedDecksPage - 1) * SAVED_DECKS_PAGE_SIZE;
    const pageDecks = decks.slice(start, start + SAVED_DECKS_PAGE_SIZE);
    els.yourDecksSummary.textContent = `${decks.length}/${MAX_SAVED_DECKS} saved deck${decks.length === 1 ? "" : "s"}`;

    if (!pageDecks.length) {
      els.savedDecksList.innerHTML = '<div class="empty-state">Save a deck to see it here.</div>';
    } else {
      const fragment = document.createDocumentFragment();
      pageDecks.forEach((deck) => fragment.appendChild(renderSavedDeckRow(deck)));
      els.savedDecksList.replaceChildren(fragment);
    }

    els.savedDecksPagination.hidden = decks.length <= SAVED_DECKS_PAGE_SIZE;
    els.savedDecksPrevBtn.disabled = state.savedDecksPage === 1;
    els.savedDecksNextBtn.disabled = state.savedDecksPage === totalPages;
    els.savedDecksPageInfo.textContent = `${state.savedDecksPage}/${totalPages}`;
  }

  function renderSavedDeckRow(deck) {
    const row = document.createElement("button");
    row.className = "saved-deck-row";
    row.type = "button";
    const previewCard = cardById.get(deck.previewCardId) || getFirstCardFromDeck(deck.cards);
    row.innerHTML = `
      <div class="saved-deck-image">
        ${previewCard ? `<img src="${escapeAttr(previewCard.imageSrc)}" alt="${escapeAttr(previewCard.id)}">` : "<span>No Image</span>"}
      </div>
      <div class="saved-deck-text">
        <strong>${escapeHtml(deck.name || "Untitled Deck")}</strong>
        <span>by ${escapeHtml(deck.author || "anonymous")}</span>
      </div>
    `;
    row.addEventListener("click", () => openSavedDeckDialog(deck.id));
    return row;
  }

  function openSaveDeckDialog() {
    els.saveDeckNameInput.value = state.deckName;
    els.saveDeckAuthorInput.value = state.author;
    els.saveDeckStatus.textContent = state.currentUser ? "" : "Login or create an account before saving.";
    els.confirmSaveDeckBtn.disabled = !state.currentUser;
    els.saveDeckDialog.showModal();
    els.saveDeckNameInput.focus();
    els.saveDeckNameInput.select();
  }

  async function saveCurrentDeckToLibrary() {
    if (!state.currentUser) {
      els.saveDeckStatus.textContent = "Login or create an account before saving.";
      return;
    }
    if (state.deck.size === 0) {
      els.saveDeckStatus.textContent = "Add at least one card before saving.";
      return;
    }

    const decks = getSavedDecks();
    if (decks.length >= MAX_SAVED_DECKS) {
      els.saveDeckStatus.textContent = `You can save up to ${MAX_SAVED_DECKS} decks. Delete one before saving another.`;
      return;
    }

    const deckName = els.saveDeckNameInput.value.trim() || "Untitled Deck";
    const author = normalizeAuthor(els.saveDeckAuthorInput.value) || "anonymous";
    updateDeckName(deckName, true, "builder");
    updateAuthor(author, true, "builder");

    const savedDeck = {
      id: createId(),
      name: state.deckName,
      author: state.author,
      cards: Object.fromEntries(state.deck),
      previewCardId: getMainCharacterCard()?.id || getDeckEntries()[0]?.card.id || null,
      savedAt: new Date().toISOString(),
    };

    if (supabaseClient && state.currentUserId) {
      const { data, error } = await supabaseClient
        .from("decks")
        .insert({
          name: savedDeck.name,
          author: savedDeck.author,
          cards: savedDeck.cards,
          preview_card_id: savedDeck.previewCardId,
        })
        .select("id,name,author,cards,preview_card_id,updated_at")
        .single();
      if (error) {
        els.saveDeckStatus.textContent = getErrorMessage(error, "Could not save deck.");
        return;
      }
      state.savedDecks.unshift({
        id: data.id,
        name: data.name,
        author: data.author,
        cards: data.cards || {},
        previewCardId: data.preview_card_id,
        savedAt: data.updated_at,
      });
      state.savedDecks = state.savedDecks.slice(0, MAX_SAVED_DECKS);
    } else {
      decks.unshift(savedDeck);
      setSavedDecks(decks);
    }

    state.savedDecksPage = 1;
    els.saveDeckDialog.close();
    renderYourDecks();
    showStatusDialog("Deck Saved", `${state.deckName} was saved to Your Decks.`);
  }

  function openSavedDeckDialog(deckId) {
    const deck = getSavedDecks().find((savedDeck) => savedDeck.id === deckId);
    if (!deck) return;
    state.selectedSavedDeckId = deckId;
    els.savedDeckDialogTitle.textContent = deck.name || "Untitled Deck";
    els.savedDeckDialogMeta.textContent = `by ${deck.author || "anonymous"}`;
    els.savedDeckDialog.showModal();
  }

  function loadSelectedSavedDeck() {
    const deck = getSavedDecks().find((savedDeck) => savedDeck.id === state.selectedSavedDeckId);
    if (!deck) return;
    state.deckName = deck.name || "Untitled Deck";
    state.author = normalizeAuthor(deck.author) || "anonymous";
    state.deck = new Map(Object.entries(deck.cards || {}).filter(([id, qty]) => cardById.has(id) && Number(qty) > 0));
    els.deckNameInput.value = state.deckName;
    els.deckAuthorInput.value = formatAuthorLine();
    els.exportDeckNameInput.value = state.deckName;
    els.authorInput.value = state.author;
    localStorage.setItem(AUTHOR_KEY, state.author);
    saveDeck();
    els.savedDeckDialog.close();
    setActiveTab("builder");
    renderDeck();
    renderCatalog();
    renderExport();
    renderDeckView();
  }

  async function deleteSelectedSavedDeck() {
    const decks = getSavedDecks();
    const deck = decks.find((savedDeck) => savedDeck.id === state.selectedSavedDeckId);
    if (!deck) return;
    if (!confirm(`Delete "${deck.name || "Untitled Deck"}"? This cannot be undone.`)) {
      return;
    }
    if (supabaseClient && state.currentUserId) {
      const { error } = await supabaseClient
        .from("decks")
        .delete()
        .eq("id", state.selectedSavedDeckId);
      if (error) {
        showText("Delete Deck", getErrorMessage(error, "Could not delete deck."));
        return;
      }
    }

    const nextDecks = decks.filter((savedDeck) => savedDeck.id !== state.selectedSavedDeckId);
    if (nextDecks.length === decks.length) return;
    if (supabaseClient && state.currentUserId) {
      state.savedDecks = nextDecks;
    } else {
      setSavedDecks(nextDecks);
    }
    state.selectedSavedDeckId = null;
    els.savedDeckDialog.close();
    renderYourDecks();
  }

  function getMainCharacterCard() {
    return getDeckEntries().find((entry) => entry.card.type === "main character")?.card || null;
  }

  function getFirstCardFromDeck(cardsObject) {
    const firstId = Object.keys(cardsObject || {}).find((id) => Number(cardsObject[id]) > 0);
    return firstId ? cardById.get(firstId) : null;
  }

  function openAuthDialog(mode) {
    state.authMode = mode;
    els.authDialogTitle.textContent = mode === "create" ? "Create Account" : "Login";
    els.authSubmitBtn.textContent = mode === "create" ? "Create Account" : "Login";
    els.authUsernameLabel.hidden = mode !== "create";
    els.authUsernameInput.value = "";
    els.authEmailInput.value = "";
    els.authPasswordInput.value = "";
    els.authStatus.textContent = "";
    els.authPasswordInput.autocomplete = mode === "create" ? "new-password" : "current-password";
    els.authDialog.showModal();
    if (mode === "create") {
      els.authUsernameInput.focus();
    } else {
      els.authEmailInput.focus();
    }
  }

  async function submitAuth() {
    const username = normalizeUsername(els.authUsernameInput.value);
    const email = normalizeEmail(els.authEmailInput.value);
    const password = els.authPasswordInput.value;
    const validation = validateCredentials({ username, email, password, requireUsername: state.authMode === "create" });
    if (validation) {
      els.authStatus.textContent = validation;
      return;
    }

    els.authSubmitBtn.disabled = true;
    els.authStatus.textContent = state.authMode === "create" ? "Creating account..." : "Logging in...";
    try {
      if (state.authMode === "create") {
        await createAccount(username, email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      els.authStatus.textContent = error?.message || "Something went wrong. Try again.";
    } finally {
      els.authSubmitBtn.disabled = false;
    }
  }

  async function createAccount(username, email, password) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        els.authStatus.textContent = getErrorMessage(error, "Could not create account.");
        return;
      }
      if (data.session?.user) {
        await setSupabaseUser(data.session.user);
        els.authDialog.close();
      } else {
        els.authStatus.textContent = "Check your email to finish creating your account.";
      }
      return;
    }

    const accounts = getAccounts();
    if (accounts[email]) {
      els.authStatus.textContent = "That email already has an account.";
      return;
    }
    if (Object.values(accounts).some((account) => normalizeUsername(account.username) === username)) {
      els.authStatus.textContent = "That username already exists.";
      return;
    }
    accounts[email] = { username, password };
    setAccounts(accounts);
    setCurrentUser(email);
    els.authDialog.close();
    renderAccount();
    renderYourDecks();
  }

  async function login(email, password) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        els.authStatus.textContent = getErrorMessage(error, "Email or password is incorrect.");
        return;
      }
      await setSupabaseUser(data.user);
      els.authDialog.close();
      return;
    }

    const account = getAccounts()[email];
    if (!account || account.password !== password) {
      els.authStatus.textContent = "Email or password is incorrect.";
      return;
    }
    setCurrentUser(email);
    els.authDialog.close();
    renderAccount();
    renderYourDecks();
  }

  async function logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    state.currentUser = null;
    state.currentUserId = null;
    state.currentProfile = null;
    state.savedDecks = [];
    localStorage.removeItem(SESSION_KEY);
    closeUserMenu();
    renderAccount();
    renderYourDecks();
  }

  async function deleteAccount() {
    if (!state.currentUser) return;
    const email = state.currentUser;
    const username = getCurrentUsername();
    if (!confirm(`Delete the account "${username}" and all saved decks? This cannot be undone.`)) {
      return;
    }
    if (supabaseClient && state.currentUserId) {
      await supabaseClient.from("decks").delete().eq("user_id", state.currentUserId);
      await supabaseClient.from("profiles").delete().eq("user_id", state.currentUserId);
      await supabaseClient.rpc("delete_current_user");
      await supabaseClient.auth.signOut();
    } else {
      const accounts = getAccounts();
      delete accounts[email];
      setAccounts(accounts);
      localStorage.removeItem(savedDecksKey(email));
      if (localStorage.getItem(SESSION_KEY) === email) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    state.currentUser = null;
    state.currentUserId = null;
    state.currentProfile = null;
    state.savedDecks = [];
    state.selectedSavedDeckId = null;
    state.savedDecksPage = 1;
    closeUserMenu();
    renderAccount();
    renderYourDecks();
  }

  function toggleUserMenu() {
    const isOpen = els.userMenuPanel.hidden;
    els.userMenuPanel.hidden = !isOpen;
    els.userMenuBtn.setAttribute("aria-expanded", String(isOpen));
  }

  function closeUserMenu() {
    els.userMenuPanel.hidden = true;
    els.userMenuBtn.setAttribute("aria-expanded", "false");
  }

  function loadSession() {
    const email = localStorage.getItem(SESSION_KEY);
    if (email && getAccounts()[email]) {
      state.currentUser = email;
    }
  }

  function setCurrentUser(email) {
    state.currentUser = email;
    state.savedDecksPage = 1;
    localStorage.setItem(SESSION_KEY, email);
  }

  function getAccounts() {
    try {
      return normalizeAccounts(JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}"));
    } catch {
      return {};
    }
  }

  function setAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function normalizeAccounts(accounts) {
    const normalized = {};
    Object.entries(accounts || {}).forEach(([key, account]) => {
      if (!account || typeof account !== "object") return;
      const email = key.includes("@") ? normalizeEmail(key) : "";
      if (!email) return;
      normalized[email] = {
        username: normalizeUsername(account.username) || email.split("@")[0],
        password: String(account.password || ""),
      };
    });
    return normalized;
  }

  function getSavedDecks() {
    if (supabaseClient) return state.savedDecks;
    if (!state.currentUser) return [];
    try {
      const decks = JSON.parse(localStorage.getItem(savedDecksKey(state.currentUser)) || "[]");
      return Array.isArray(decks) ? decks.slice(0, MAX_SAVED_DECKS) : [];
    } catch {
      return [];
    }
  }

  function setSavedDecks(decks) {
    if (!state.currentUser) return;
    localStorage.setItem(savedDecksKey(state.currentUser), JSON.stringify(decks.slice(0, MAX_SAVED_DECKS)));
  }

  function savedDecksKey(email) {
    return `${SAVED_DECKS_PREFIX}${email}`;
  }

  function getCurrentUsername() {
    if (state.currentProfile?.username) return state.currentProfile.username;
    const account = getAccounts()[state.currentUser];
    return account?.username || state.currentUser || "";
  }

  function validateCredentials({ username, email, password, requireUsername }) {
    if (requireUsername && !username) return "Enter a username.";
    if (requireUsername && username.length > 20) return "Username must be 20 characters or less.";
    if (!email) return "Enter an email.";
    if (!isValidEmail(email)) return "Enter a valid email.";
    if (password.length < 6 || password.length > 20) return "Password must be 6 to 20 characters.";
    return "";
  }

  function getErrorMessage(error, fallback) {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    return error.message
      || error.msg
      || error.error_description
      || error.error
      || error.details
      || error.hint
      || error.error_code
      || fallback;
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
      return buildTtsExportText();
    }
    const entries = getDeckEntries();
    const sections = DECK_VIEW_PILES.flatMap((pile) => {
      const pileEntries = entries.filter((entry) => pileMatchesCard(pile, entry.card));
      if (!pileEntries.length) return [];
      const lines = pileEntries.map(({ card, qty }) => `${qty}x ${card.id}: ${card.name}`);
      return [`=== ${pile.label} ===`, ...lines, ""];
    });
    return sections.join("\n").trim();
  }

  function buildTtsExportText() {
    const entries = getDeckEntries();
    const tokens = DECK_VIEW_PILES.flatMap((pile) => {
      const pileEntries = entries.filter((entry) => pileMatchesCard(pile, entry.card));
      if (!pileEntries.length) return [];
      return pileEntries.map(({ card, qty }) => `${ttsPileCode(pile.key)}:${qty}:${toTtsCardId(card.id)}`);
    });
    return tokens.length ? `MLPDBTTS|${tokens.join("|")}` : "";
  }

  function ttsPileCode(key) {
    return {
      "main-character": "MC",
      "main-deck": "MD",
      story: "ST",
      scene: "SC",
    }[key] || "MD";
  }

  function toTtsCardId(id) {
    return String(id || "").replace(/^※/, "ALT-");
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
    link.download = `${slugify(state.deckName)}${state.exportFormat === "tts" ? "-tts" : ""}.txt`;
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
    const sidePileGap = 30;
    const sectionHeaderH = 44;
    const sectionHeaderW = 180;
    const badgeR = 19;
    const badgeOverflow = 23;
    const piles = DECK_VIEW_PILES.map((pile) => {
      const pileEntries = entries.filter((entry) => pileMatchesCard(pile, entry.card));
      const columns = deckViewPileColumns(pile, pileEntries.length);
      const rows = Math.max(1, Math.ceil(pileEntries.length / columns));
      const gridW = columns * cardW + Math.max(0, columns - 1) * colGap;
      return {
        ...pile,
        entries: pileEntries,
        total: pileEntries.reduce((sum, entry) => sum + entry.qty, 0),
        columns,
        rows,
        width: Math.max(sectionHeaderW, gridW),
        gridW,
        height: sectionHeaderH + 18 + rows * cardH + Math.max(0, rows - 1) * rowGap + badgeOverflow,
      };
    }).filter((pile) => pile.entries.length);
    const mainPile = piles.find((pile) => pile.key === "main-deck");
    const sidePiles = ["main-character", "scene", "story"]
      .map((key) => piles.find((pile) => pile.key === key))
      .filter(Boolean);
    const sideRowHeight = sidePiles.length ? Math.max(...sidePiles.map((pile) => pile.height)) : 0;
    const sectionHeights = [
      ...(mainPile ? [mainPile.height] : []),
      ...(sidePiles.length ? [sideRowHeight] : []),
    ];
    const boardH = margin
      + sectionHeights.reduce((sum, sectionHeight) => sum + sectionHeight, 0)
      + Math.max(0, sectionHeights.length - 1) * sectionGap
      + margin;
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

    const drawPile = (pile, x, y) => {
      ctx.fillStyle = "#2c246d";
      ctx.fillRect(x, y, sectionHeaderW, sectionHeaderH);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "900 18px system-ui, sans-serif";
      ctx.fillText(pile.label, x + 18, y + sectionHeaderH / 2);
      ctx.textAlign = "right";
      ctx.fillText(String(pile.total), x + sectionHeaderW - 18, y + sectionHeaderH / 2);

      const gridY = y + sectionHeaderH + 18;
      pile.entries.forEach(({ card, qty }, index) => {
        const col = index % pile.columns;
        const row = Math.floor(index / pile.columns);
        const cardX = x + col * (cardW + colGap);
        const cardY = gridY + row * (cardH + rowGap);
        const image = imageCache.get(card.imageSrc);
        ctx.drawImage(image, cardX, cardY, cardW, cardH);

        ctx.beginPath();
        ctx.arc(cardX + cardW / 2, cardY + cardH + 4, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = "#252a33";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "950 25px system-ui, sans-serif";
        ctx.fillText(String(qty), cardX + cardW / 2, cardY + cardH + 4);
      });
    };

    let y = boardY + margin;
    if (mainPile) {
      drawPile(mainPile, boardX + margin, y);
      y += mainPile.height + (sidePiles.length ? sectionGap : 0);
    }
    if (sidePiles.length) {
      let x = boardX + margin;
      sidePiles.forEach((pile) => {
        drawPile(pile, x, y);
        x += pile.width + sidePileGap;
      });
    }

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
    els.copyDialogBtn.hidden = false;
    els.dialogExportText.value = text;
    els.exportDialog.showModal();
  }

  function showStatusDialog(title, text) {
    els.dialogTitle.textContent = title;
    els.copyDialogBtn.hidden = true;
    els.dialogExportText.value = text;
    els.exportDialog.showModal();
  }

  function showCardPreview(card) {
    els.cardPreviewDialog.classList.toggle("is-story-preview", card.type === "story");
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

  function createRestSupabaseClient(baseUrl, anonKey) {
    const sessionKey = "mlpdb.supabase.session.v1";
    let session = readSession();

    const getAuthHeaders = async (useUserAuth = true, extra = {}) => {
      if (useUserAuth) await refreshSessionIfNeeded();
      return {
        apikey: anonKey,
        Authorization: `Bearer ${useUserAuth && session?.access_token ? session.access_token : anonKey}`,
        ...extra,
      };
    };

    const requestJson = async (path, options = {}) => {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          ...options,
          headers: {
            ...(await getAuthHeaders(options.auth !== false, { "Content-Type": "application/json" })),
            ...(options.headers || {}),
          },
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
          return { data: null, error: data || { message: response.statusText } };
        }
        return { data, error: null };
      } catch (error) {
        return { data: null, error: { message: error?.message || "Network request failed." } };
      }
    };

    function readSession() {
      try {
        return JSON.parse(localStorage.getItem(sessionKey) || "null");
      } catch {
        return null;
      }
    }

    function writeSession(nextSession) {
      session = nextSession;
      if (nextSession) {
        localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      } else {
        localStorage.removeItem(sessionKey);
      }
    }

    async function refreshSessionIfNeeded() {
      if (!session?.refresh_token) return;
      const expiresAt = Number(session.expires_at || 0);
      const expiresSoon = !expiresAt || expiresAt * 1000 < Date.now() + 60000;
      if (!expiresSoon) return;

      const result = await requestJson("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
        auth: false,
      });
      if (result.data?.access_token) {
        writeSession(result.data);
      } else if (result.error) {
        writeSession(null);
      }
    }

    class RestQuery {
      constructor(table) {
        this.table = table;
        this.params = new URLSearchParams();
        this.method = "GET";
        this.body = null;
        this.headers = {};
        this.allowEmptySingle = false;
      }

      select(columns) {
        this.params.set("select", columns);
        return this;
      }

      eq(column, value) {
        this.params.set(column, `eq.${value}`);
        return this;
      }

      order(column, options = {}) {
        this.params.set("order", `${column}.${options.ascending ? "asc" : "desc"}`);
        return this;
      }

      limit(value) {
        this.params.set("limit", String(value));
        return this;
      }

      insert(body) {
        this.method = "POST";
        this.body = body;
        this.headers.Prefer = "return=representation";
        return this;
      }

      upsert(body, options = {}) {
        this.method = "POST";
        this.body = body;
        if (options.onConflict) this.params.set("on_conflict", options.onConflict);
        this.headers.Prefer = "resolution=merge-duplicates,return=representation";
        return this;
      }

      delete() {
        this.method = "DELETE";
        return this;
      }

      single() {
        this.allowEmptySingle = false;
        this.headers.Accept = "application/vnd.pgrst.object+json";
        return this.execute();
      }

      maybeSingle() {
        this.allowEmptySingle = true;
        this.headers.Accept = "application/vnd.pgrst.object+json";
        return this.execute();
      }

      then(resolve, reject) {
        return this.execute().then(resolve, reject);
      }

      async execute() {
        const query = this.params.toString();
        try {
          const response = await fetch(`${baseUrl}/rest/v1/${this.table}${query ? `?${query}` : ""}`, {
          method: this.method,
          headers: {
            ...(await getAuthHeaders(true, {
              "Content-Type": "application/json",
              ...this.headers,
            })),
          },
            body: this.body ? JSON.stringify(this.body) : null,
          });
          const text = await response.text();
          const data = text ? JSON.parse(text) : null;
          if (!response.ok) {
            if (this.allowEmptySingle && response.status === 406) return { data: null, error: null };
            return { data: null, error: data || { message: response.statusText } };
          }
          return { data, error: null };
        } catch (error) {
          return { data: null, error: { message: error?.message || "Network request failed." } };
        }
      }
    }

    return {
      auth: {
        async getSession() {
          return { data: { session }, error: null };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        },
        async signUp({ email, password, options }) {
          const result = await requestJson("/auth/v1/signup", {
            method: "POST",
            body: JSON.stringify({ email, password, data: options?.data || {} }),
            auth: false,
          });
          if (result.data?.access_token) writeSession(result.data);
          return {
            data: {
              session: result.data?.access_token ? result.data : null,
              user: result.data?.user || result.data,
            },
            error: result.error,
          };
        },
        async signInWithPassword({ email, password }) {
          const result = await requestJson("/auth/v1/token?grant_type=password", {
            method: "POST",
            body: JSON.stringify({ email, password }),
            auth: false,
          });
          if (result.data?.access_token) writeSession(result.data);
          return {
            data: {
              session: result.data,
              user: result.data?.user,
            },
            error: result.error,
          };
        },
        async signOut() {
          writeSession(null);
          return { error: null };
        },
      },
      from(table) {
        return new RestQuery(table);
      },
      async rpc(name) {
        return requestJson(`/rest/v1/rpc/${name}`, { method: "POST", body: "{}" });
      },
    };
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
    const embedded = normalizeMetadataSource(window.CARD_METADATA);
    try {
      return {
        ...embedded,
        ...(JSON.parse(localStorage.getItem(METADATA_KEY) || "{}").cards || {}),
      };
    } catch {
      return embedded;
    }
  }

  function normalizeMetadataSource(source) {
    if (!source) return {};
    return source.cards || source;
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

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
