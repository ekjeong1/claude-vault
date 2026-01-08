import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { NoteScanner } from './noteScanner';
import { NoteAnalyzer } from './noteAnalyzer';
import { NoteConnectorSettingTab } from './settingsTab';
import { NoteConnectorView, NOTE_CONNECTOR_VIEW_TYPE } from './noteConnectorView';
import { NoteConnectorSettings, DEFAULT_SETTINGS, NoteInfo, NoteSuggestion } from './types';

export default class NoteConnectorPlugin extends Plugin {
  settings: NoteConnectorSettings;
  private noteScanner: NoteScanner;
  private noteAnalyzer: NoteAnalyzer;

  async onload() {
    await this.loadSettings();
    
    // Initialize components
    this.noteScanner = new NoteScanner(this.app.vault);
    this.noteAnalyzer = new NoteAnalyzer(this.app, this.settings);
    
    // Register view
    this.registerView(
      NOTE_CONNECTOR_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new NoteConnectorView(leaf, this)
    );
    
    // Add ribbon icon
    this.addRibbonIcon('link', 'Note Connector', () => {
      this.activateView();
    });
    
    // Add command to open the view
    this.addCommand({
      id: 'open-note-connector',
      name: 'Open Note Connector',
      callback: () => {
        this.activateView();
      }
    });
    
    // Add command to scan for isolated notes
    this.addCommand({
      id: 'scan-isolated-notes',
      name: 'Scan for Isolated Notes',
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
    
    // Add settings tab
    this.addSettingTab(new NoteConnectorSettingTab(this.app, this));
    
    console.log('Note Connector plugin loaded');
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE);
    console.log('Note Connector plugin unloaded');
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
    // Check if view is already open
    const existingView = this.app.workspace.getLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE)[0];
    
    if (existingView) {
      // Focus existing view
      this.app.workspace.revealLeaf(existingView);
      return;
    }
    
    // Create new view
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: NOTE_CONNECTOR_VIEW_TYPE,
      active: true,
    });
    
    // Focus the new view
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE)[0]
    );
  }

  /**
   * Gets the current Note Connector view if it exists
   * @returns NoteConnectorView | null
   */
  getView(): NoteConnectorView | null {
    const leaves = this.app.workspace.getLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE);
    if (leaves.length === 0) {
      return null;
    }
    
    return leaves[0].view as NoteConnectorView;
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
  async scanForIsolatedNotes(): Promise<NoteInfo[]> {
    try {
      // Find isolated notes
      const isolatedNotes = await this.noteScanner.findIsolatedNotes();
      
      if (isolatedNotes.length === 0) {
        return [];
      }
      
      // Get all markdown files for comparison
      const allFiles = await this.noteScanner.getAllMarkdownFiles();
      
      // Analyze each isolated note
      const analyzedNotes: NoteInfo[] = [];
      
      for (const note of isolatedNotes) {
        const analyzedNote = await this.noteAnalyzer.analyzeNote(note, allFiles);
        analyzedNotes.push(analyzedNote);
      }
      
      return analyzedNotes;
    } catch (error) {
      console.error('Error scanning for isolated notes:', error);
      new Notice('Error scanning for isolated notes');
      return [];
    }
  }

  /**
   * Connects two notes by creating links between them
   * @param sourceNote The source note
   * @param targetSuggestion The target note suggestion
   * @returns Promise<boolean> Success status
   */
  async connectNotes(sourceNote: NoteInfo, targetSuggestion: NoteSuggestion): Promise<boolean> {
    return this.noteAnalyzer.createLink(
      sourceNote,
      targetSuggestion,
      this.settings.createBacklinks
    );
  }
}