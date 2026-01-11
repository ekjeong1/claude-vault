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

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-vault-monitor\main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VaultMonitorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-vault-monitor\view
var import_obsidian = require("obsidian");
var VIEW_TYPE_VAULT_MONITOR = "vault-monitor-view";
var VaultMonitorView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "contentEl");
    __publicField(this, "statsEl");
    __publicField(this, "activityLogEl");
    __publicField(this, "refreshInterval");
    this.plugin = plugin;
    this.refreshInterval = window.setInterval(() => {
      this.refreshView();
    }, 3e4);
  }
  getViewType() {
    return VIEW_TYPE_VAULT_MONITOR;
  }
  getDisplayText() {
    return "Vault Monitor";
  }
  getIcon() {
    return "activity";
  }
  async onOpen() {
    const { containerEl } = this;
    this.contentEl = containerEl.createDiv({ cls: "vault-monitor-container" });
    const headerEl = this.contentEl.createEl("div", { cls: "vault-monitor-header" });
    headerEl.createEl("h2", { text: "Vault Monitor" });
    const refreshBtn = headerEl.createEl("button", {
      cls: "vault-monitor-refresh-btn",
      text: "Refresh"
    });
    refreshBtn.addEventListener("click", () => this.refreshView());
    const statsSection = this.contentEl.createEl("div", { cls: "vault-monitor-section" });
    statsSection.createEl("h3", { text: "Vault Statistics" });
    this.statsEl = statsSection.createDiv({ cls: "vault-monitor-stats" });
    const activitySection = this.contentEl.createEl("div", { cls: "vault-monitor-section" });
    activitySection.createEl("h3", { text: "Recent Activity" });
    this.activityLogEl = activitySection.createDiv({ cls: "vault-monitor-activity-log" });
    const eventRef = this.app.workspace.on("vault-monitor:change-recorded", () => {
      this.refreshView();
    });
    this.registerEvent(eventRef);
    await this.refreshView();
  }
  async onClose() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  async refreshView() {
    await this.refreshStats();
    this.refreshActivityLog();
  }
  async refreshStats() {
    this.statsEl.empty();
    const stats = await this.plugin.vaultStats.refreshStats();
    const statsGrid = this.statsEl.createDiv({ cls: "vault-monitor-stats-grid" });
    this.createStatItem(statsGrid, "Total Notes", stats.totalNotes.toString());
    this.createStatItem(statsGrid, "Total Links", stats.totalLinks.toString());
    this.createStatItem(statsGrid, "Isolated Notes", stats.isolatedNotes.toString());
    const lastUpdated = this.statsEl.createDiv({ cls: "vault-monitor-last-updated" });
    lastUpdated.setText(`Last updated: ${new Date(stats.lastUpdated).toLocaleString()}`);
  }
  createStatItem(container, label, value) {
    const statItem = container.createDiv({ cls: "vault-monitor-stat-item" });
    statItem.createDiv({ cls: "vault-monitor-stat-value", text: value });
    statItem.createDiv({ cls: "vault-monitor-stat-label", text: label });
    return statItem;
  }
  refreshActivityLog() {
    this.activityLogEl.empty();
    const recentChanges = this.plugin.vaultTracker.getRecentChanges(10);
    if (recentChanges.length === 0) {
      this.activityLogEl.createDiv({
        cls: "vault-monitor-empty-log",
        text: "No recent activity"
      });
      return;
    }
    const activityList = this.activityLogEl.createEl("ul", { cls: "vault-monitor-activity-list" });
    recentChanges.forEach((change) => {
      const item = activityList.createEl("li", { cls: "vault-monitor-activity-item" });
      const iconClass = this.getChangeTypeIcon(change.type);
      item.createSpan({ cls: `vault-monitor-activity-icon ${iconClass}` });
      const content = item.createDiv({ cls: "vault-monitor-activity-content" });
      content.createDiv({
        cls: "vault-monitor-activity-title",
        text: `${this.capitalizeFirstLetter(change.type)}: ${change.filename}`
      });
      content.createDiv({
        cls: "vault-monitor-activity-time",
        text: new Date(change.timestamp).toLocaleString()
      });
    });
  }
  getChangeTypeIcon(type) {
    switch (type) {
      case "added":
        return "vault-monitor-icon-added";
      case "deleted":
        return "vault-monitor-icon-deleted";
      case "modified":
        return "vault-monitor-icon-modified";
      default:
        return "";
    }
  }
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-vault-monitor\vault-tracker
var import_obsidian2 = require("obsidian");
var VaultChangeTracker = class {
  constructor(app, plugin) {
    __publicField(this, "app");
    __publicField(this, "plugin");
    __publicField(this, "recentChanges", []);
    __publicField(this, "maxChanges", 1e3);
    // Maximum number of changes to store in memory
    __publicField(this, "eventRefs", []);
    this.app = app;
    this.plugin = plugin;
  }
  startTracking() {
    this.registerFileEvents();
  }
  stopTracking() {
    this.eventRefs.forEach((ref) => {
      this.app.vault.offref(ref);
    });
    this.eventRefs = [];
  }
  registerFileEvents() {
    const createRef = this.app.vault.on("create", (file) => {
      if (file instanceof import_obsidian2.TFile && file.extension === "md") {
        this.recordChange("added", file);
      }
    });
    this.eventRefs.push(createRef);
    this.plugin.registerEvent(createRef);
    const deleteRef = this.app.vault.on("delete", (file) => {
      if (file instanceof import_obsidian2.TFile && file.extension === "md") {
        this.recordChange("deleted", file);
      }
    });
    this.eventRefs.push(deleteRef);
    this.plugin.registerEvent(deleteRef);
    const modifyRef = this.app.vault.on("modify", (file) => {
      if (file instanceof import_obsidian2.TFile && file.extension === "md") {
        this.recordChange("modified", file);
      }
    });
    this.eventRefs.push(modifyRef);
    this.plugin.registerEvent(modifyRef);
  }
  recordChange(type, file) {
    const change = {
      type,
      filename: file.name,
      path: file.path,
      timestamp: Date.now()
    };
    this.recentChanges.unshift(change);
    if (this.recentChanges.length > this.maxChanges) {
      this.recentChanges = this.recentChanges.slice(0, this.maxChanges);
    }
    if (type === "added" || type === "deleted") {
      const message = `Note ${type}: ${file.name}`;
      this.plugin.showNotification(message);
    }
    this.app.workspace.trigger("vault-monitor:change-recorded");
  }
  getRecentChanges(limit) {
    if (limit) {
      return this.recentChanges.slice(0, limit);
    }
    return this.recentChanges;
  }
  // Clean up old changes based on retention period
  cleanupOldChanges() {
    const cutoffTime = Date.now() - this.plugin.settings.logRetentionDays * 24 * 60 * 60 * 1e3;
    this.recentChanges = this.recentChanges.filter((change) => change.timestamp >= cutoffTime);
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-vault-monitor\vault-stats
var VaultStats = class {
  constructor(app) {
    __publicField(this, "app");
    __publicField(this, "stats");
    this.app = app;
    this.stats = {
      totalNotes: 0,
      totalLinks: 0,
      isolatedNotes: 0,
      lastUpdated: 0
    };
  }
  async refreshStats() {
    var _a;
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const { metadataCache } = this.app;
    let totalLinks = 0;
    let isolatedNotes = 0;
    for (const file of markdownFiles) {
      const cache = metadataCache.getFileCache(file);
      const outgoingLinks = ((_a = cache == null ? void 0 : cache.links) == null ? void 0 : _a.length) || 0;
      const backlinks = Object.values(metadataCache.resolvedLinks[file.path] || {}).reduce((sum, count) => sum + count, 0);
      totalLinks += outgoingLinks;
      if (outgoingLinks === 0 && backlinks === 0) {
        isolatedNotes++;
      }
    }
    this.stats = {
      totalNotes: markdownFiles.length,
      totalLinks,
      isolatedNotes,
      lastUpdated: Date.now()
    };
    return this.stats;
  }
  getStats() {
    return this.stats;
  }
  // Format a timestamp as a readable date/time string
  static formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-vault-monitor\main.ts
var DEFAULT_SETTINGS = {
  enableNotifications: true,
  logRetentionDays: 30,
  showInSidebar: true
};
var VaultMonitorPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "vaultTracker");
    __publicField(this, "vaultStats");
  }
  async onload() {
    await this.loadSettings();
    this.vaultStats = new VaultStats(this.app);
    this.vaultTracker = new VaultChangeTracker(this.app, this);
    this.registerView(
      VIEW_TYPE_VAULT_MONITOR,
      (leaf) => new VaultMonitorView(leaf, this)
    );
    this.addRibbonIcon("activity", "Vault Monitor", () => {
      this.activateView();
    });
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.showInSidebar) {
        this.initLeftSidebar();
      }
    });
    this.addCommand({
      id: "open-vault-monitor",
      name: "Open Vault Monitor",
      callback: () => this.activateView()
    });
    this.addSettingTab(new VaultMonitorSettingTab(this.app, this));
    this.vaultTracker.startTracking();
    console.log("Vault Monitor plugin loaded");
  }
  // Initialize the left sidebar view
  initLeftSidebar() {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_VAULT_MONITOR).length) {
      return;
    }
    this.app.workspace.getLeftLeaf(false).setViewState({
      type: VIEW_TYPE_VAULT_MONITOR,
      active: false
    });
  }
  onunload() {
    this.vaultTracker.stopTracking();
    console.log("Vault Monitor plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_VAULT_MONITOR)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({
        type: VIEW_TYPE_VAULT_MONITOR,
        active: true
      });
    }
    workspace.revealLeaf(leaf);
  }
  showNotification(message) {
    if (this.settings.enableNotifications) {
      new import_obsidian3.Notice(message);
    }
  }
};
var VaultMonitorSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Vault Monitor Settings" });
    new import_obsidian3.Setting(containerEl).setName("Enable Notifications").setDesc("Show notifications when notes are added or deleted").addToggle((toggle) => toggle.setValue(this.plugin.settings.enableNotifications).onChange(async (value) => {
      this.plugin.settings.enableNotifications = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian3.Setting(containerEl).setName("Show in Sidebar").setDesc("Automatically show Vault Monitor in the left sidebar").addToggle((toggle) => toggle.setValue(this.plugin.settings.showInSidebar).onChange(async (value) => {
      this.plugin.settings.showInSidebar = value;
      await this.plugin.saveSettings();
      if (!value) {
        const leaves = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_VAULT_MONITOR);
        leaves.forEach((leaf) => {
          if (leaf.getViewState().type === VIEW_TYPE_VAULT_MONITOR && leaf.parentSplit && leaf.parentSplit.type === "tabs") {
            leaf.detach();
          }
        });
      } else {
        this.plugin.initLeftSidebar();
      }
    }));
    new import_obsidian3.Setting(containerEl).setName("Log Retention Period").setDesc("Number of days to keep activity logs (1-365)").addSlider((slider) => slider.setLimits(1, 365, 1).setValue(this.plugin.settings.logRetentionDays).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.logRetentionDays = value;
      await this.plugin.saveSettings();
    }));
  }
};
