import { App, TFile, Vault } from 'obsidian';
import { NoteInfo, NoteSuggestion, NoteConnectorSettings } from './types';

export class NoteAnalyzer {
  private vault: Vault;
  private app: App;
  private settings: NoteConnectorSettings;

  constructor(app: App, settings: NoteConnectorSettings) {
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
  async analyzeNote(isolatedNote: NoteInfo, allNotes: TFile[]): Promise<NoteInfo> {
    // Filter out the current note from the comparison list
    const comparisonNotes = allNotes.filter(note => note.path !== isolatedNote.path);
    
    const suggestions: NoteSuggestion[] = [];
    
    // If AI analysis is enabled, use it for more accurate results
    if (this.settings.useAIForRelevance) {
      const aiSuggestions = await this.getAISuggestions(isolatedNote, comparisonNotes);
      suggestions.push(...aiSuggestions);
    } else {
      // Fallback to basic keyword matching
      const basicSuggestions = await this.getBasicSuggestions(isolatedNote, comparisonNotes);
      suggestions.push(...basicSuggestions);
    }
    
    // Sort by relevance score (descending) and limit to max suggestions
    const sortedSuggestions = suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter(suggestion => suggestion.relevanceScore >= this.settings.minRelevanceScore)
      .slice(0, this.settings.maxSuggestionsPerNote);
    
    // Update the isolated note with suggestions
    isolatedNote.suggestions = sortedSuggestions;
    
    return isolatedNote;
  }

  /**
   * Gets suggestions using basic keyword matching
   * @param isolatedNote The isolated note
   * @param comparisonNotes Notes to compare against
   * @returns Promise<NoteSuggestion[]> Suggested notes
   */
  private async getBasicSuggestions(isolatedNote: NoteInfo, comparisonNotes: TFile[]): Promise<NoteSuggestion[]> {
    const suggestions: NoteSuggestion[] = [];
    
    // Extract keywords from the isolated note (simple implementation)
    const keywords = this.extractKeywords(isolatedNote.content);
    
    for (const note of comparisonNotes) {
      const content = await this.vault.cachedRead(note);
      const relevanceScore = this.calculateRelevanceScore(keywords, content);
      
      if (relevanceScore > 0) {
        suggestions.push({
          file: note,
          title: note.basename,
          path: note.path,
          relevanceScore: relevanceScore,
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
  private async getAISuggestions(isolatedNote: NoteInfo, comparisonNotes: TFile[]): Promise<NoteSuggestion[]> {
    const suggestions: NoteSuggestion[] = [];
    
    try {
      // Get the Vibesidian plugin
      const vibesidian = this.app.plugins.getPlugin('vibesidian');
      
      if (!vibesidian) {
        console.error('Vibesidian plugin not found');
        return this.getBasicSuggestions(isolatedNote, comparisonNotes);
      }
      
      // Prepare a sample of comparison notes (limit to 20 to avoid token limits)
      const sampleNotes = comparisonNotes.slice(0, 20);
      const noteContents: {[path: string]: string} = {};
      
      for (const note of sampleNotes) {
        noteContents[note.path] = await this.vault.cachedRead(note);
      }
      
      // Create the prompt for the AI
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
      
      // Generate AI response
      const response = await vibesidian.generateText({
        prompt: prompt,
      });
      
      // Parse the AI response
      const aiSuggestions = this.parseAIResponse(response.text, comparisonNotes);
      suggestions.push(...aiSuggestions);
      
    } catch (error) {
      console.error('Error using AI for suggestions:', error);
      // Fallback to basic suggestions
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
  private parseAIResponse(aiResponse: string, allNotes: TFile[]): NoteSuggestion[] {
    const suggestions: NoteSuggestion[] = [];
    
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return suggestions;
      
      const jsonStr = jsonMatch[0];
      const parsedSuggestions = JSON.parse(jsonStr);
      
      // Convert to NoteSuggestion objects
      for (const suggestion of parsedSuggestions) {
        const file = allNotes.find(note => note.path === suggestion.path);
        if (file) {
          suggestions.push({
            file: file,
            title: file.basename,
            path: suggestion.path,
            relevanceScore: suggestion.relevanceScore,
            relevanceReason: suggestion.relevanceReason
          });
        }
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }
    
    return suggestions;
  }

  /**
   * Extracts keywords from text (simple implementation)
   * @param text The text to extract keywords from
   * @returns string[] Array of keywords
   */
  private extractKeywords(text: string): string[] {
    // Remove common stop words and punctuation
    const stopWords = ['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'is', 'are', 'was', 'were'];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 3) // Only words longer than 3 characters
      .filter(word => !stopWords.includes(word)); // Remove stop words
    
    // Count word frequency
    const wordCount: {[word: string]: number} = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    
    // Sort by frequency and take top 20 keywords
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(entry => entry[0]);
  }

  /**
   * Calculates relevance score based on keyword matching
   * @param keywords Keywords from the source note
   * @param targetContent Content of the target note
   * @returns number Relevance score between 0 and 1
   */
  private calculateRelevanceScore(keywords: string[], targetContent: string): number {
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
  async createLink(sourceNote: NoteInfo, targetNote: NoteSuggestion, createBacklink: boolean): Promise<boolean> {
    try {
      // Add link to the source note
      const sourceContent = await this.vault.read(sourceNote.file);
      const updatedSourceContent = sourceContent + `\n\n## Related Notes\n- [[${targetNote.title}]] - ${targetNote.relevanceReason}\n`;
      
      await this.vault.modify(sourceNote.file, updatedSourceContent);
      
      // Add backlink if enabled
      if (createBacklink) {
        const targetContent = await this.vault.read(targetNote.file);
        const updatedTargetContent = targetContent + `\n\n## Related Notes\n- [[${sourceNote.title}]]\n`;
        
        await this.vault.modify(targetNote.file, updatedTargetContent);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating link:', error);
      return false;
    }
  }
}