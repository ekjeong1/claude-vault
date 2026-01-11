import { TFile, Vault } from 'obsidian';
import { NoteInfo } from './types';

export class NoteScanner {
  private vault: Vault;
  // 위키링크 정규식 패턴 - [[링크]] 또는 [[링크|표시텍스트]] 형식 모두 캡처
  private readonly WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

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
    
    console.log(`Found ${markdownFiles.length} markdown files in the vault`);
    return markdownFiles;
  }

  /**
   * Extracts wiki links from note content
   * @param content The note content to analyze
   * @returns string[] Array of link targets (paths or titles)
   */
  extractWikiLinks(content: string): string[] {
    const links: string[] = [];
    let match;
    
    // Reset regex state
    this.WIKI_LINK_REGEX.lastIndex = 0;
    
    // Find all wiki links in the content
    while ((match = this.WIKI_LINK_REGEX.exec(content)) !== null) {
      if (match[1]) {
        links.push(match[1]);
      }
    }
    
    return links;
  }

  /**
   * Resolves a link target to a file path
   * @param linkTarget The link target (title or path)
   * @param allFiles All markdown files in the vault
   * @returns string|null The resolved file path or null if not found
   */
  resolveLinkTarget(linkTarget: string, allFiles: TFile[]): string | null {
    // First try to find exact path match
    const exactPathMatch = allFiles.find(f => f.path === linkTarget || f.path === `${linkTarget}.md`);
    if (exactPathMatch) {
      return exactPathMatch.path;
    }
    
    // Then try to find basename match
    const basenameMatch = allFiles.find(f => f.basename === linkTarget);
    if (basenameMatch) {
      return basenameMatch.path;
    }
    
    return null;
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
    
    // Check if the file has incoming links (backlinks)
    let hasIncomingLinks = false;
    for (const [source, targets] of allLinks.entries()) {
      if (source !== filePath && targets.includes(filePath)) {
        hasIncomingLinks = true;
        break;
      }
    }
    
    const isIsolated = !hasOutgoingLinks && !hasIncomingLinks;
    
    console.log(`Note ${filePath}: outgoing links: ${hasOutgoingLinks ? 'YES' : 'NO'}, incoming links: ${hasIncomingLinks ? 'YES' : 'NO'}, isolated: ${isIsolated ? 'YES' : 'NO'}`);
    
    return isIsolated;
  }

  /**
   * Gets all links in the vault
   * @returns Promise<Map<string, string[]>> Map of source files to target files
   */
  async getAllLinks(): Promise<Map<string, string[]>> {
    console.log('Starting to analyze all links in the vault...');
    const linkMap = new Map<string, string[]>();
    const files = await this.getAllMarkdownFiles();
    
    // Process each file to extract its outgoing links
    for (const file of files) {
      try {
        // Read the file content
        const content = await this.vault.cachedRead(file);
        
        // Extract wiki links from content
        const extractedLinks = this.extractWikiLinks(content);
        console.log(`Found ${extractedLinks.length} raw links in ${file.path}`);
        
        // Resolve link targets to actual file paths
        const resolvedLinks: string[] = [];
        for (const link of extractedLinks) {
          const resolvedPath = this.resolveLinkTarget(link, files);
          if (resolvedPath) {
            resolvedLinks.push(resolvedPath);
          }
        }
        
        // Store the resolved links in the map
        linkMap.set(file.path, resolvedLinks);
        console.log(`Resolved ${resolvedLinks.length} links in ${file.path}`);
      } catch (error) {
        console.error(`Error processing links in ${file.path}:`, error);
        // Initialize with empty array in case of error
        linkMap.set(file.path, []);
      }
    }
    
    console.log(`Finished analyzing links for ${files.length} files`);
    return linkMap;
  }

  /**
   * Finds all isolated notes in the vault
   * @returns Promise<NoteInfo[]> Array of isolated notes with their info
   */
  async findIsolatedNotes(): Promise<NoteInfo[]> {
    console.log('Starting to find isolated notes...');
    const isolatedNotes: NoteInfo[] = [];
    const files = await this.getAllMarkdownFiles();
    const allLinks = await this.getAllLinks();
    
    console.log(`Checking ${files.length} files for isolation...`);
    
    for (const file of files) {
      if (this.isIsolatedNote(file, allLinks)) {
        try {
          const content = await this.vault.cachedRead(file);
          
          isolatedNotes.push({
            file: file,
            title: file.basename,
            path: file.path,
            content: content,
            suggestions: []
          });
          
          console.log(`Added isolated note: ${file.path}`);
        } catch (error) {
          console.error(`Error reading content for ${file.path}:`, error);
        }
      }
    }
    
    console.log(`Found ${isolatedNotes.length} isolated notes`);
    return isolatedNotes;
  }
}