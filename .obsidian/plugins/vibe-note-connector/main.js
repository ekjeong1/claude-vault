var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NoteConnectorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\noteScanner
var NoteScanner = class {
  constructor(vault) {
    __publicField(this, "vault");
    this.vault = vault;
  }
  /**
   * Scans the vault for all markdown files
   * @returns Promise<TFile[]> Array of markdown files
   */
  async getAllMarkdownFiles() {
    const markdownFiles = [];
    const files = this.vault.getFiles();
    for (const file of files) {
      if (file.extension === "md") {
        markdownFiles.push(file);
      }
    }
    return markdownFiles;
  }
  /**
   * Checks if a note has any links (outgoing or incoming)
   * @param file The file to check
   * @param allLinks Map of all links in the vault
   * @returns boolean True if the note is isolated
   */
  isIsolatedNote(file, allLinks) {
    const filePath = file.path;
    const hasOutgoingLinks = allLinks.has(filePath) && allLinks.get(filePath).length > 0;
    let hasIncomingLinks = false;
    for (const [_, targets] of allLinks.entries()) {
      if (targets.includes(filePath)) {
        hasIncomingLinks = true;
        break;
      }
    }
    return !hasOutgoingLinks && !hasIncomingLinks;
  }
  /**
   * Gets all links in the vault
   * @returns Promise<Map<string, string[]>> Map of source files to target files
   */
  async getAllLinks() {
    const linkMap = /* @__PURE__ */ new Map();
    const files = await this.getAllMarkdownFiles();
    for (const file of files) {
      const links = this.vault.getMarkdownFiles().filter((f) => f.path !== file.path).map((f) => f.path);
      linkMap.set(file.path, links);
    }
    return linkMap;
  }
  /**
   * Finds all isolated notes in the vault
   * @returns Promise<NoteInfo[]> Array of isolated notes with their info
   */
  async findIsolatedNotes() {
    const isolatedNotes = [];
    const files = await this.getAllMarkdownFiles();
    const allLinks = await this.getAllLinks();
    for (const file of files) {
      if (this.isIsolatedNote(file, allLinks)) {
        const content = await this.vault.cachedRead(file);
        isolatedNotes.push({
          file,
          title: file.basename,
          path: file.path,
          content,
          suggestions: []
        });
      }
    }
    return isolatedNotes;
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\noteAnalyzer
var NoteAnalyzer = class {
  constructor(app, settings) {
    __publicField(this, "vault");
    __publicField(this, "app");
    __publicField(this, "settings");
    this.app = app;
    this.vault = app.vault;
    this.settings = settings;
  }
  /**
   * Analyzes an isolated note and finds related notes
   * @param isolatedNote The isolated note to analyze
   * @param allNotes All notes in the vault for comparison
   * @returns Promise<NoteInfo> The isolated note with suggestions
   */
  async analyzeNote(isolatedNote, allNotes) {
    const comparisonNotes = allNotes.filter((note) => note.path !== isolatedNote.path);
    const suggestions = [];
    if (this.settings.useAIForRelevance) {
      const aiSuggestions = await this.getAISuggestions(isolatedNote, comparisonNotes);
      suggestions.push(...aiSuggestions);
    } else {
      const basicSuggestions = await this.getBasicSuggestions(isolatedNote, comparisonNotes);
      suggestions.push(...basicSuggestions);
    }
    const sortedSuggestions = suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).filter((suggestion) => suggestion.relevanceScore >= this.settings.minRelevanceScore).slice(0, this.settings.maxSuggestionsPerNote);
    isolatedNote.suggestions = sortedSuggestions;
    return isolatedNote;
  }
  /**
   * Gets suggestions using basic keyword matching
   * @param isolatedNote The isolated note
   * @param comparisonNotes Notes to compare against
   * @returns Promise<NoteSuggestion[]> Suggested notes
   */
  async getBasicSuggestions(isolatedNote, comparisonNotes) {
    const suggestions = [];
    const keywords = this.extractKeywords(isolatedNote.content);
    for (const note of comparisonNotes) {
      const content = await this.vault.cachedRead(note);
      const relevanceScore = this.calculateRelevanceScore(keywords, content);
      if (relevanceScore > 0) {
        suggestions.push({
          file: note,
          title: note.basename,
          path: note.path,
          relevanceScore,
          relevanceReason: `Contains ${Math.round(relevanceScore * 100)}% of keywords`
        });
      }
    }
    return suggestions;
  }
  /**
   * Gets suggestions using AI analysis
   * @param isolatedNote The isolated note
   * @param comparisonNotes Notes to compare against
   * @returns Promise<NoteSuggestion[]> AI-suggested notes
   */
  async getAISuggestions(isolatedNote, comparisonNotes) {
    const suggestions = [];
    try {
      const vibesidian = this.app.plugins.getPlugin("vibesidian");
      if (!vibesidian) {
        console.error("Vibesidian plugin not found");
        return this.getBasicSuggestions(isolatedNote, comparisonNotes);
      }
      const sampleNotes = comparisonNotes.slice(0, 20);
      const noteContents = {};
      for (const note of sampleNotes) {
        noteContents[note.path] = await this.vault.cachedRead(note);
      }
      const prompt = `
I have an isolated note in my Obsidian vault that I want to connect to related notes.

ISOLATED NOTE TITLE: ${isolatedNote.title}
ISOLATED NOTE CONTENT:
${isolatedNote.content}

I have several other notes in my vault. For each note, analyze how relevant it is to the isolated note above.
Assign a relevance score between 0 and 1, where 1 means highly relevant and 0 means not relevant at all.
Also provide a brief reason for the relevance.

Return the results as a JSON array of objects with the following structure:
[
  {
    "path": "note path",
    "relevanceScore": 0.75,
    "relevanceReason": "Brief explanation of why this note is relevant"
  }
]

Only include notes with a relevance score of at least 0.3.
`;
      const response = await vibesidian.generateText({
        prompt
      });
      const aiSuggestions = this.parseAIResponse(response.text, comparisonNotes);
      suggestions.push(...aiSuggestions);
    } catch (error) {
      console.error("Error using AI for suggestions:", error);
      return this.getBasicSuggestions(isolatedNote, comparisonNotes);
    }
    return suggestions;
  }
  /**
   * Parses the AI response to extract suggestions
   * @param aiResponse The text response from the AI
   * @param allNotes All notes for reference
   * @returns NoteSuggestion[] Parsed suggestions
   */
  parseAIResponse(aiResponse, allNotes) {
    const suggestions = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return suggestions;
      const jsonStr = jsonMatch[0];
      const parsedSuggestions = JSON.parse(jsonStr);
      for (const suggestion of parsedSuggestions) {
        const file = allNotes.find((note) => note.path === suggestion.path);
        if (file) {
          suggestions.push({
            file,
            title: file.basename,
            path: suggestion.path,
            relevanceScore: suggestion.relevanceScore,
            relevanceReason: suggestion.relevanceReason
          });
        }
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
    }
    return suggestions;
  }
  /**
   * Extracts keywords from text (simple implementation)
   * @param text The text to extract keywords from
   * @returns string[] Array of keywords
   */
  extractKeywords(text) {
    const stopWords = ["the", "and", "a", "an", "in", "on", "at", "to", "for", "with", "by", "of", "is", "are", "was", "were"];
    const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((word) => word.length > 3).filter((word) => !stopWords.includes(word));
    const wordCount = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    return Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 20).map((entry) => entry[0]);
  }
  /**
   * Calculates relevance score based on keyword matching
   * @param keywords Keywords from the source note
   * @param targetContent Content of the target note
   * @returns number Relevance score between 0 and 1
   */
  calculateRelevanceScore(keywords, targetContent) {
    if (keywords.length === 0) return 0;
    const targetContentLower = targetContent.toLowerCase();
    let matchCount = 0;
    for (const keyword of keywords) {
      if (targetContentLower.includes(keyword)) {
        matchCount++;
      }
    }
    return matchCount / keywords.length;
  }
  /**
   * Creates a link between two notes
   * @param sourceNote Source note to add the link to
   * @param targetNote Target note to link to
   * @param createBacklink Whether to also create a backlink
   * @returns Promise<boolean> Success status
   */
  async createLink(sourceNote, targetNote, createBacklink) {
    try {
      const sourceContent = await this.vault.read(sourceNote.file);
      const updatedSourceContent = sourceContent + `

## Related Notes
- [[${targetNote.title}]] - ${targetNote.relevanceReason}
`;
      await this.vault.modify(sourceNote.file, updatedSourceContent);
      if (createBacklink) {
        const targetContent = await this.vault.read(targetNote.file);
        const updatedTargetContent = targetContent + `

## Related Notes
- [[${sourceNote.title}]]
`;
        await this.vault.modify(targetNote.file, updatedTargetContent);
      }
      return true;
    } catch (error) {
      console.error("Error creating link:", error);
      return false;
    }
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\settingsTab
var import_obsidian = require("obsidian");
var NoteConnectorSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Note Connector Settings" });
    new import_obsidian.Setting(containerEl).setName("Minimum relevance score").setDesc("Only suggest connections with at least this relevance score (0-1)").addSlider((slider) => slider.setLimits(0, 1, 0.05).setValue(this.plugin.settings.minRelevanceScore).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.minRelevanceScore = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Maximum suggestions per note").setDesc("Maximum number of suggestions to show for each isolated note").addSlider((slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.maxSuggestionsPerNote).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.maxSuggestionsPerNote = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Scan on startup").setDesc("Automatically scan for isolated notes when Obsidian starts").addToggle((toggle) => toggle.setValue(this.plugin.settings.scanOnStartup).onChange(async (value) => {
      this.plugin.settings.scanOnStartup = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Create backlinks").setDesc("When adding a link to an isolated note, also add a backlink from the target note").addToggle((toggle) => toggle.setValue(this.plugin.settings.createBacklinks).onChange(async (value) => {
      this.plugin.settings.createBacklinks = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Use AI for relevance analysis").setDesc("Use AI to analyze note relevance (requires Vibesidian plugin)").addToggle((toggle) => toggle.setValue(this.plugin.settings.useAIForRelevance).onChange(async (value) => {
      this.plugin.settings.useAIForRelevance = value;
      await this.plugin.saveSettings();
    }));
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\noteConnectorView
var import_obsidian2 = require("obsidian");
var NOTE_CONNECTOR_VIEW_TYPE = "note-connector-view";
var NoteConnectorView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "contentEl");
    __publicField(this, "isolatedNotes", []);
    __publicField(this, "isLoading", false);
    this.plugin = plugin;
    this.contentEl = this.containerEl.children[1].createDiv({ cls: "note-connector-view" });
  }
  getViewType() {
    return NOTE_CONNECTOR_VIEW_TYPE;
  }
  getDisplayText() {
    return "Note Connector";
  }
  async onOpen() {
    this.renderView();
    if (this.plugin.settings.scanOnStartup) {
      this.startScan();
    }
  }
  async onClose() {
  }
  /**
   * Renders the main view
   */
  renderView() {
    this.contentEl.empty();
    const headerEl = this.contentEl.createDiv({ cls: "note-connector-header" });
    headerEl.createEl("h2", { text: "Note Connector", cls: "note-connector-title" });
    const buttonContainer = headerEl.createDiv({ cls: "note-connector-buttons" });
    const scanButton = buttonContainer.createEl("button", {
      text: "Scan for Isolated Notes",
      cls: "note-connector-scan-button mod-cta"
    });
    scanButton.addEventListener("click", () => this.startScan());
    const settingsButton = buttonContainer.createEl("button", {
      cls: "note-connector-settings-button"
    });
    (0, import_obsidian2.setIcon)(settingsButton, "settings");
    settingsButton.addEventListener("click", () => {
      this.plugin.openSettingsTab();
    });
    if (this.isLoading) {
      this.renderLoadingState();
    } else if (this.isolatedNotes.length === 0) {
      this.renderEmptyState();
    } else {
      this.renderIsolatedNotes();
    }
  }
  /**
   * Renders the loading state
   */
  renderLoadingState() {
    const loadingEl = this.contentEl.createDiv({ cls: "note-connector-loading" });
    loadingEl.createEl("span", { text: "Scanning and analyzing notes..." });
    const progressContainer = this.contentEl.createDiv({ cls: "note-connector-progress-container" });
    const progressEl = progressContainer.createEl("progress", {
      cls: "note-connector-progress",
      attr: { max: "100", value: "0" }
    });
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      if (progress > 100) progress = 0;
      progressEl.value = progress;
      if (!this.isLoading) {
        clearInterval(progressInterval);
        this.renderView();
      }
    }, 500);
  }
  /**
   * Renders the empty state
   */
  renderEmptyState() {
    const emptyEl = this.contentEl.createDiv({ cls: "note-connector-empty-state" });
    emptyEl.createEl("p", { text: "No isolated notes found in your vault." });
    emptyEl.createEl("p", { text: 'Click "Scan for Isolated Notes" to start.' });
  }
  /**
   * Renders the list of isolated notes with suggestions
   */
  renderIsolatedNotes() {
    const notesContainer = this.contentEl.createDiv({ cls: "note-connector-notes-container" });
    notesContainer.createEl("p", {
      text: `Found ${this.isolatedNotes.length} isolated notes in your vault.`,
      cls: "note-connector-summary"
    });
    for (const note of this.isolatedNotes) {
      const noteEl = notesContainer.createDiv({ cls: "note-connector-isolated-note" });
      const titleEl = noteEl.createEl("div", { cls: "note-connector-note-title" });
      titleEl.createEl("span", { text: note.title });
      const openButton = titleEl.createEl("button", {
        cls: "note-connector-open-button",
        attr: { "aria-label": "Open note" }
      });
      (0, import_obsidian2.setIcon)(openButton, "file-text");
      openButton.addEventListener("click", () => this.openNote(note.file));
      noteEl.createEl("div", { text: note.path, cls: "note-connector-note-path" });
      if (note.suggestions.length > 0) {
        const suggestionsEl = noteEl.createDiv({ cls: "note-connector-suggestions" });
        suggestionsEl.createEl("div", { text: "Suggested connections:", cls: "note-connector-suggestions-header" });
        for (const suggestion of note.suggestions) {
          const suggestionEl = suggestionsEl.createDiv({ cls: "note-connector-suggestion" });
          suggestionEl.createEl("span", {
            text: suggestion.title,
            cls: "note-connector-suggestion-title"
          });
          suggestionEl.createEl("span", {
            text: `${Math.round(suggestion.relevanceScore * 100)}%`,
            cls: "note-connector-suggestion-score"
          });
          const actionsEl = suggestionEl.createDiv({ cls: "note-connector-suggestion-actions" });
          const connectButton = actionsEl.createEl("button", {
            cls: "note-connector-connect-button",
            attr: { "aria-label": "Connect notes" }
          });
          (0, import_obsidian2.setIcon)(connectButton, "link");
          connectButton.addEventListener("click", () => this.connectNotes(note, suggestion));
          const openSuggestionButton = actionsEl.createEl("button", {
            cls: "note-connector-open-suggestion-button",
            attr: { "aria-label": "Open note" }
          });
          (0, import_obsidian2.setIcon)(openSuggestionButton, "file-text");
          openSuggestionButton.addEventListener("click", () => this.openNote(suggestion.file));
        }
      } else {
        noteEl.createEl("div", {
          text: "No relevant connections found for this note.",
          cls: "note-connector-no-suggestions"
        });
      }
    }
  }
  /**
   * Starts the scanning process
   */
  async startScan() {
    this.isLoading = true;
    this.renderView();
    try {
      this.isolatedNotes = await this.plugin.scanForIsolatedNotes();
      new import_obsidian2.Notice(`Found ${this.isolatedNotes.length} isolated notes`);
    } catch (error) {
      console.error("Error scanning for isolated notes:", error);
      new import_obsidian2.Notice("Error scanning for isolated notes");
    } finally {
      this.isLoading = false;
      this.renderView();
    }
  }
  /**
   * Opens a note in a new leaf
   * @param file The file to open
   */
  openNote(file) {
    this.app.workspace.getLeaf(true).openFile(file);
  }
  /**
   * Connects two notes by creating links between them
   * @param sourceNote The source note
   * @param targetSuggestion The target note suggestion
   */
  async connectNotes(sourceNote, targetSuggestion) {
    try {
      const success = await this.plugin.connectNotes(sourceNote, targetSuggestion);
      if (success) {
        new import_obsidian2.Notice(`Connected "${sourceNote.title}" to "${targetSuggestion.title}"`);
        sourceNote.suggestions = sourceNote.suggestions.filter(
          (suggestion) => suggestion.path !== targetSuggestion.path
        );
        this.renderView();
      } else {
        new import_obsidian2.Notice("Failed to connect notes");
      }
    } catch (error) {
      console.error("Error connecting notes:", error);
      new import_obsidian2.Notice("Error connecting notes");
    }
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\types
var DEFAULT_SETTINGS = {
  minRelevanceScore: 0.3,
  maxSuggestionsPerNote: 5,
  scanOnStartup: false,
  createBacklinks: true,
  useAIForRelevance: true
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\main.ts
var NoteConnectorPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "noteScanner");
    __publicField(this, "noteAnalyzer");
  }
  async onload() {
    await this.loadSettings();
    this.noteScanner = new NoteScanner(this.app.vault);
    this.noteAnalyzer = new NoteAnalyzer(this.app, this.settings);
    this.registerView(
      NOTE_CONNECTOR_VIEW_TYPE,
      (leaf) => new NoteConnectorView(leaf, this)
    );
    this.addRibbonIcon("link", "Note Connector", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-note-connector",
      name: "Open Note Connector",
      callback: () => {
        this.activateView();
      }
    });
    this.addCommand({
      id: "scan-isolated-notes",
      name: "Scan for Isolated Notes",
      callback: async () => {
        const view = this.getView();
        if (view) {
          await view.startScan();
        } else {
          await this.activateView();
          const newView = this.getView();
          if (newView) {
            await newView.startScan();
          }
        }
      }
    });
    this.addSettingTab(new NoteConnectorSettingTab(this.app, this));
    console.log("Note Connector plugin loaded");
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE);
    console.log("Note Connector plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /**
   * Activates the Note Connector view
   */
  async activateView() {
    const existingView = this.app.workspace.getLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE)[0];
    if (existingView) {
      this.app.workspace.revealLeaf(existingView);
      return;
    }
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: NOTE_CONNECTOR_VIEW_TYPE,
      active: true
    });
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE)[0]
    );
  }
  /**
   * Gets the current Note Connector view if it exists
   * @returns NoteConnectorView | null
   */
  getView() {
    const leaves = this.app.workspace.getLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE);
    if (leaves.length === 0) {
      return null;
    }
    return leaves[0].view;
  }
  /**
   * Opens the settings tab
   */
  openSettingsTab() {
    this.app.setting.open();
    this.app.setting.openTabById(this.manifest.id);
  }
  /**
   * Scans for isolated notes and analyzes them
   * @returns Promise<NoteInfo[]> Array of isolated notes with suggestions
   */
  async scanForIsolatedNotes() {
    try {
      const isolatedNotes = await this.noteScanner.findIsolatedNotes();
      if (isolatedNotes.length === 0) {
        return [];
      }
      const allFiles = await this.noteScanner.getAllMarkdownFiles();
      const analyzedNotes = [];
      for (const note of isolatedNotes) {
        const analyzedNote = await this.noteAnalyzer.analyzeNote(note, allFiles);
        analyzedNotes.push(analyzedNote);
      }
      return analyzedNotes;
    } catch (error) {
      console.error("Error scanning for isolated notes:", error);
      new import_obsidian3.Notice("Error scanning for isolated notes");
      return [];
    }
  }
  /**
   * Connects two notes by creating links between them
   * @param sourceNote The source note
   * @param targetSuggestion The target note suggestion
   * @returns Promise<boolean> Success status
   */
  async connectNotes(sourceNote, targetSuggestion) {
    return this.noteAnalyzer.createLink(
      sourceNote,
      targetSuggestion,
      this.settings.createBacklinks
    );
  }
};
