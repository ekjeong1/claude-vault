import { ItemView, WorkspaceLeaf, Notice, setIcon, TFile } from 'obsidian';
import NoteConnectorPlugin from './main';
import { NoteInfo, NoteSuggestion } from './types';

export const NOTE_CONNECTOR_VIEW_TYPE = 'note-connector-view';

export class NoteConnectorView extends ItemView {
  private plugin: NoteConnectorPlugin;
  private contentEl: HTMLElement;
  private isolatedNotes: NoteInfo[] = [];
  private isLoading: boolean = false;

  constructor(leaf: WorkspaceLeaf, plugin: NoteConnectorPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.contentEl = this.containerEl.children[1].createDiv({ cls: 'note-connector-view' });
  }

  getViewType(): string {
    return NOTE_CONNECTOR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Note Connector';
  }

  async onOpen(): Promise<void> {
    this.renderView();
    
    if (this.plugin.settings.scanOnStartup) {
      this.startScan();
    }
  }

  async onClose(): Promise<void> {
    // Nothing to clean up
  }

  /**
   * Renders the main view
   */
  renderView(): void {
    this.contentEl.empty();
    
    // Create header
    const headerEl = this.contentEl.createDiv({ cls: 'note-connector-header' });
    headerEl.createEl('h2', { text: 'Note Connector', cls: 'note-connector-title' });
    
    const buttonContainer = headerEl.createDiv({ cls: 'note-connector-buttons' });
    
    // Scan button
    const scanButton = buttonContainer.createEl('button', { 
      text: 'Scan for Isolated Notes',
      cls: 'note-connector-scan-button mod-cta'
    });
    scanButton.addEventListener('click', () => this.startScan());
    
    // Settings button
    const settingsButton = buttonContainer.createEl('button', { 
      cls: 'note-connector-settings-button'
    });
    setIcon(settingsButton, 'settings');
    settingsButton.addEventListener('click', () => {
      this.plugin.openSettingsTab();
    });
    
    // Content area
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
  renderLoadingState(): void {
    const loadingEl = this.contentEl.createDiv({ cls: 'note-connector-loading' });
    loadingEl.createEl('span', { text: 'Scanning and analyzing notes...' });
    
    // Add a progress bar
    const progressContainer = this.contentEl.createDiv({ cls: 'note-connector-progress-container' });
    const progressEl = progressContainer.createEl('progress', { 
      cls: 'note-connector-progress',
      attr: { max: '100', value: '0' }
    });
    
    // Update progress periodically (simulated for now)
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
  renderEmptyState(): void {
    const emptyEl = this.contentEl.createDiv({ cls: 'note-connector-empty-state' });
    emptyEl.createEl('p', { text: 'No isolated notes found in your vault.' });
    emptyEl.createEl('p', { text: 'Click "Scan for Isolated Notes" to start.' });
  }

  /**
   * Renders the list of isolated notes with suggestions
   */
  renderIsolatedNotes(): void {
    const notesContainer = this.contentEl.createDiv({ cls: 'note-connector-notes-container' });
    
    // Summary
    notesContainer.createEl('p', { 
      text: `Found ${this.isolatedNotes.length} isolated notes in your vault.`,
      cls: 'note-connector-summary'
    });
    
    // Render each isolated note
    for (const note of this.isolatedNotes) {
      const noteEl = notesContainer.createDiv({ cls: 'note-connector-isolated-note' });
      
      // Note title and path
      const titleEl = noteEl.createEl('div', { cls: 'note-connector-note-title' });
      titleEl.createEl('span', { text: note.title });
      
      // Add open button
      const openButton = titleEl.createEl('button', { 
        cls: 'note-connector-open-button',
        attr: { 'aria-label': 'Open note' }
      });
      setIcon(openButton, 'file-text');
      openButton.addEventListener('click', () => this.openNote(note.file));
      
      noteEl.createEl('div', { text: note.path, cls: 'note-connector-note-path' });
      
      // Suggestions section
      if (note.suggestions.length > 0) {
        const suggestionsEl = noteEl.createDiv({ cls: 'note-connector-suggestions' });
        suggestionsEl.createEl('div', { text: 'Suggested connections:', cls: 'note-connector-suggestions-header' });
        
        // Render each suggestion
        for (const suggestion of note.suggestions) {
          const suggestionEl = suggestionsEl.createDiv({ cls: 'note-connector-suggestion' });
          
          // Suggestion title
          suggestionEl.createEl('span', { 
            text: suggestion.title,
            cls: 'note-connector-suggestion-title'
          });
          
          // Relevance score
          suggestionEl.createEl('span', { 
            text: `${Math.round(suggestion.relevanceScore * 100)}%`,
            cls: 'note-connector-suggestion-score'
          });
          
          // Actions
          const actionsEl = suggestionEl.createDiv({ cls: 'note-connector-suggestion-actions' });
          
          // Connect button
          const connectButton = actionsEl.createEl('button', { 
            cls: 'note-connector-connect-button',
            attr: { 'aria-label': 'Connect notes' }
          });
          setIcon(connectButton, 'link');
          connectButton.addEventListener('click', () => this.connectNotes(note, suggestion));
          
          // Open button
          const openSuggestionButton = actionsEl.createEl('button', { 
            cls: 'note-connector-open-suggestion-button',
            attr: { 'aria-label': 'Open note' }
          });
          setIcon(openSuggestionButton, 'file-text');
          openSuggestionButton.addEventListener('click', () => this.openNote(suggestion.file));
        }
      } else {
        noteEl.createEl('div', { 
          text: 'No relevant connections found for this note.',
          cls: 'note-connector-no-suggestions'
        });
      }
    }
  }

  /**
   * Starts the scanning process
   */
  async startScan(): Promise<void> {
    this.isLoading = true;
    this.renderView();
    
    try {
      // Scan for isolated notes
      this.isolatedNotes = await this.plugin.scanForIsolatedNotes();
      new Notice(`Found ${this.isolatedNotes.length} isolated notes`);
    } catch (error) {
      console.error('Error scanning for isolated notes:', error);
      new Notice('Error scanning for isolated notes');
    } finally {
      this.isLoading = false;
      this.renderView();
    }
  }

  /**
   * Opens a note in a new leaf
   * @param file The file to open
   */
  openNote(file: TFile): void {
    this.app.workspace.getLeaf(true).openFile(file);
  }

  /**
   * Connects two notes by creating links between them
   * @param sourceNote The source note
   * @param targetSuggestion The target note suggestion
   */
  async connectNotes(sourceNote: NoteInfo, targetSuggestion: NoteSuggestion): Promise<void> {
    try {
      const success = await this.plugin.connectNotes(sourceNote, targetSuggestion);
      
      if (success) {
        new Notice(`Connected "${sourceNote.title}" to "${targetSuggestion.title}"`);
        
        // Remove the suggestion from the list
        sourceNote.suggestions = sourceNote.suggestions.filter(
          suggestion => suggestion.path !== targetSuggestion.path
        );
        
        // Refresh the view
        this.renderView();
      } else {
        new Notice('Failed to connect notes');
      }
    } catch (error) {
      console.error('Error connecting notes:', error);
      new Notice('Error connecting notes');
    }
  }
}