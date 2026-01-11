import { Plugin, WorkspaceLeaf, Notice, TFile, EventRef } from 'obsidian';
import { NoteScanner } from './noteScanner';
import { NoteAnalyzer } from './noteAnalyzer';
import { InvariantChecker } from './invariantChecker';
import { NoteConnectorSettingTab } from './settingsTab';
import { NoteConnectorView, NOTE_CONNECTOR_VIEW_TYPE } from './noteConnectorView';
import { NoteConnectorSettings, DEFAULT_SETTINGS, NoteInfo, NoteSuggestion, InvariantViolation } from './types';

export default class NoteConnectorPlugin extends Plugin {
  settings: NoteConnectorSettings;
  private noteScanner: NoteScanner;
  private noteAnalyzer: NoteAnalyzer;
  private invariantChecker: InvariantChecker;
  private fileModifyEventRef: EventRef;

  async onload() {
    await this.loadSettings();
    
    // Log settings to verify they loaded correctly
    console.log('Note Connector settings loaded:', {
      autoTriggerOnSave: this.settings.autoTriggerOnSave,
      checkInvariants: this.settings.checkInvariants,
      invariantsFilePath: this.settings.invariantsFilePath
    });
    
    // Initialize components
    this.noteScanner = new NoteScanner(this.app.vault);
    this.noteAnalyzer = new NoteAnalyzer(this.app, this.settings);
    this.invariantChecker = new InvariantChecker(this.app, this.settings.invariantsFilePath);
    
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
    
    // Add command to check invariants for current note
    this.addCommand({
      id: 'check-note-invariants',
      name: 'Check Current Note Against Invariants',
      editorCallback: async (editor, view) => {
        if (view.file) {
          await this.checkNoteInvariants(view.file);
        }
      }
    });
    
    // Add command to analyze current note for connections
    this.addCommand({
      id: 'analyze-current-note',
      name: 'Analyze Current Note for Connections',
      editorCallback: async (editor, view) => {
        if (view.file) {
          await this.analyzeNoteForConnections(view.file);
        }
      }
    });
    
    // Register event handler for file modifications
    this.registerFileEvents();
    
    // Add settings tab
    this.addSettingTab(new NoteConnectorSettingTab(this.app, this));
    
    // Load invariants
    this.invariantChecker.loadInvariants();
    
    console.log('Note Connector plugin loaded');
  }

  onunload() {
    // Unregister event handlers
    this.app.vault.offref(this.fileModifyEventRef);
    
    // Detach views
    this.app.workspace.detachLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE);
    
    console.log('Note Connector plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update invariant checker with new file path if it changed
    this.invariantChecker = new InvariantChecker(this.app, this.settings.invariantsFilePath);
    await this.invariantChecker.loadInvariants();
    
    // If auto-trigger setting changed, make sure events are properly registered
    console.log('Settings saved, auto-trigger is now:', this.settings.autoTriggerOnSave);
  }

  /**
   * Registers event handlers for file modifications
   */
  private registerFileEvents() {
    // Register for both modify and create events to catch all file changes
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Only process if auto-trigger is enabled
          if (this.settings.autoTriggerOnSave) {
            // Wait a short time to ensure the file is fully saved
            setTimeout(async () => {
              await this.processModifiedNote(file);
            }, 500);
          }
        }
      })
    );
    
    // Also register for the 'create' event to catch new files
    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Only process if auto-trigger is enabled
          if (this.settings.autoTriggerOnSave) {
            // Wait a short time to ensure the file is fully created
            setTimeout(async () => {
              await this.processModifiedNote(file);
            }, 500);
          }
        }
      })
    );
    
    // Register for metadata cache events which are triggered when a file is saved
    this.registerEvent(
      this.app.metadataCache.on('changed', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Only process if auto-trigger is enabled
          if (this.settings.autoTriggerOnSave) {
            // Process the file after metadata is updated
            setTimeout(async () => {
              await this.processModifiedNote(file);
            }, 500);
          }
        }
      })
    );
  }

  /**
   * Processes a modified note
   * @param file The modified file
   */
  private async processModifiedNote(file: TFile) {
    console.log(`Processing modified note: ${file.path}, auto-trigger: ${this.settings.autoTriggerOnSave}, check invariants: ${this.settings.checkInvariants}`);
    
    // Check invariants if enabled
    if (this.settings.checkInvariants) {
      console.log(`Checking invariants for: ${file.path}`);
      const violations = await this.checkNoteInvariants(file);
      console.log(`Found ${violations.length} invariant violations`);
    }
    
    // Analyze for connections
    console.log(`Analyzing connections for: ${file.path}`);
    await this.analyzeNoteForConnections(file);
  }

  /**
   * Checks if a note adheres to the invariants
   * @param file The note file to check
   */
  async checkNoteInvariants(file: TFile): Promise<InvariantViolation[]> {
    try {
      console.log(`Starting invariant check for file: ${file.path}`);
      
      // Read the note content
      const content = await this.app.vault.read(file);
      console.log(`Read ${content.length} characters from file`);
      
      // Check against invariants
      console.log(`Checking against invariants from: ${this.settings.invariantsFilePath}`);
      const violations = await this.invariantChecker.checkNoteAgainstInvariants(content);
      console.log(`Invariant check complete. Found ${violations.length} violations`);
      
      // Show violations if any
      if (violations.length > 0) {
        console.log('Showing violations notice');
        this.invariantChecker.showViolationsNotice(violations);
      }
      
      return violations;
    } catch (error) {
      console.error('Error checking note invariants:', error);
      new Notice('Error checking note invariants');
      return [];
    }
  }

  /**
   * Analyzes a note for potential connections
   * @param file The note file to analyze
   */
  async analyzeNoteForConnections(file: TFile): Promise<void> {
    try {
      // Get all markdown files for comparison
      const allFiles = await this.noteScanner.getAllMarkdownFiles();
      
      // Create a temporary NoteInfo object for the current note
      const content = await this.app.vault.read(file);
      const noteInfo: NoteInfo = {
        file: file,
        title: file.basename,
        path: file.path,
        content: content,
        suggestions: []
      };
      
      // Analyze the note
      const analyzedNote = await this.noteAnalyzer.analyzeNote(noteInfo, allFiles);
      
      // If there are suggestions, show a notice
      if (analyzedNote.suggestions.length > 0) {
        const notice = new Notice(
          `Found ${analyzedNote.suggestions.length} potential connections for "${file.basename}"`,
          8000 // 8 seconds
        );
        
        // Add a button to the notice to open the view
        const noticeEl = notice.noticeEl;
        const viewButton = noticeEl.createEl('button', {
          text: 'View Connections',
          cls: 'mod-cta'
        });
        
        viewButton.addEventListener('click', async () => {
          // Open the view and show the analyzed note
          await this.activateView();
          const view = this.getView();
          if (view) {
            view.showAnalyzedNote(analyzedNote);
          }
        });
      }
    } catch (error) {
      console.error('Error analyzing note for connections:', error);
    }
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