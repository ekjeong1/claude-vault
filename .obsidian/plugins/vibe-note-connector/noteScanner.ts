import { TFile, Vault } from 'obsidian';
import { NoteInfo } from './types';

export class NoteScanner {
  private vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  /**
   * Scans the vault for all markdown files
   * @returns Promise<TFile[]> Array of markdown files
   */
  async getAllMarkdownFiles(): Promise<TFile[]> {
    const markdownFiles: TFile[] = [];
    
    // Get all files in the vault
    const files = this.vault.getFiles();
    
    // Filter for markdown files only
    for (const file of files) {
      if (file.extension === 'md') {
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
  isIsolatedNote(file: TFile, allLinks: Map<string, string[]>): boolean {
    const filePath = file.path;
    
    // Check if the file has outgoing links
    const hasOutgoingLinks = allLinks.has(filePath) && allLinks.get(filePath)!.length > 0;
    
    // Check if the file has incoming links
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
  async getAllLinks(): Promise<Map<string, string[]>> {
    const linkMap = new Map<string, string[]>();
    const files = await this.getAllMarkdownFiles();
    
    for (const file of files) {
      const links = this.vault.getMarkdownFiles()
        .filter(f => f.path !== file.path) // Exclude self-links
        .map(f => f.path);
      
      linkMap.set(file.path, links);
    }
    
    return linkMap;
  }

  /**
   * Finds all isolated notes in the vault
   * @returns Promise<NoteInfo[]> Array of isolated notes with their info
   */
  async findIsolatedNotes(): Promise<NoteInfo[]> {
    const isolatedNotes: NoteInfo[] = [];
    const files = await this.getAllMarkdownFiles();
    const allLinks = await this.getAllLinks();
    
    for (const file of files) {
      if (this.isIsolatedNote(file, allLinks)) {
        const content = await this.vault.cachedRead(file);
        
        isolatedNotes.push({
          file: file,
          title: file.basename,
          path: file.path,
          content: content,
          suggestions: []
        });
      }
    }
    
    return isolatedNotes;
  }
}