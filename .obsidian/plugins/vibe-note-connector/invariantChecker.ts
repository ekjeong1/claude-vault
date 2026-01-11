import { App, TFile, Notice, Modal } from 'obsidian';
import { InvariantViolation } from './types';

export class InvariantChecker {
  private app: App;
  private invariantsFilePath: string;
  private invariants: Array<{
    number: number;
    name: string;
    principle: string;
    description: string;
  }> = [];
  private invariantsLoaded: boolean = false;

  constructor(app: App, invariantsFilePath: string) {
    this.app = app;
    this.invariantsFilePath = invariantsFilePath;
  }

  /**
   * Loads the invariants from the specified file
   * @returns Promise<boolean> Success status
   */
  async loadInvariants(): Promise<boolean> {
    try {
      // Get the invariants file
      const invariantsFile = this.app.vault.getAbstractFileByPath(this.invariantsFilePath);
      
      if (!invariantsFile || !(invariantsFile instanceof TFile)) {
        console.error(`Invariants file not found at ${this.invariantsFilePath}`);
        return false;
      }
      
      // Read the file content
      const content = await this.app.vault.read(invariantsFile as TFile);
      
      // Parse the invariants
      this.parseInvariants(content);
      this.invariantsLoaded = true;
      
      return true;
    } catch (error) {
      console.error('Error loading invariants:', error);
      return false;
    }
  }

  /**
   * Parses the invariants from the file content
   * @param content The content of the invariants file
   */
  private parseInvariants(content: string): void {
    this.invariants = [];
    
    // Regular expression to match invariant sections
    // Looks for "## 불변량 X: Name" pattern
    const invariantRegex = /## 불변량 (\d+): ([^\n]+)[\s\S]*?### 원칙\s*\n\s*\*\*"([^"]+)"\*\*\s*\n\s*([^\n]+)/g;
    
    let match;
    while ((match = invariantRegex.exec(content)) !== null) {
      const number = parseInt(match[1]);
      const name = match[2].trim();
      const principle = match[3].trim();
      const description = match[4].trim();
      
      this.invariants.push({
        number,
        name,
        principle,
        description
      });
    }
    
    console.log(`Loaded ${this.invariants.length} invariants from ${this.invariantsFilePath}`);
  }

  /**
   * Checks if a note adheres to the invariants
   * @param noteContent The content of the note to check
   * @returns Promise<InvariantViolation[]> Array of violations, empty if none
   */
  async checkNoteAgainstInvariants(noteContent: string): Promise<InvariantViolation[]> {
    if (!this.invariantsLoaded) {
      const loaded = await this.loadInvariants();
      if (!loaded) {
        return [{
          invariantNumber: 0,
          invariantName: "Error",
          description: "Failed to load invariants",
          violationReason: "Could not load invariants file",
          suggestion: `Check that the invariants file exists at ${this.invariantsFilePath}`
        }];
      }
    }
    
    const violations: InvariantViolation[] = [];
    
    // Check each invariant (using Promise.all for parallel processing)
    const violationPromises = this.invariants.map(invariant => 
      this.checkInvariant(invariant, noteContent)
    );
    
    const violationResults = await Promise.all(violationPromises);
    
    // Add all non-null violations to the array
    for (const violation of violationResults) {
      if (violation) {
        violations.push(violation);
      }
    }
    
    return violations;
  }

  /**
   * Checks a specific invariant against a note
   * @param invariant The invariant to check
   * @param noteContent The content of the note
   * @returns Promise<InvariantViolation | null> Violation if found, null otherwise
   */
  private async checkInvariant(
    invariant: { number: number; name: string; principle: string; description: string },
    noteContent: string
  ): Promise<InvariantViolation | null> {
    try {
      const vibesidian = this.app.plugins.getPlugin('vibesidian');
      
      if (!vibesidian) {
        console.log('Vibesidian plugin not found, using rule-based checks only');
      }
      
      // Use our enhanced invariant checking logic
      const violation = await this.simpleInvariantCheck(invariant, noteContent);
      return violation;
    } catch (error) {
      console.error('Error checking invariant:', error);
      return null;
    }
  }

  /**
   * Enhanced invariant check using more sophisticated analysis and AI assistance when available
   * @param invariant The invariant to check
   * @param noteContent The content of the note
   * @returns InvariantViolation | null Violation if found, null otherwise
   */
  private async simpleInvariantCheck(
    invariant: { number: number; name: string; principle: string; description: string },
    noteContent: string
  ): Promise<InvariantViolation | null> {
    const contentLower = noteContent.toLowerCase();
    
    // Try to use AI for more sophisticated analysis if available
    try {
      const vibesidian = this.app.plugins.getPlugin('vibesidian');
      if (vibesidian) {
        const aiAnalysis = await this.performAIAnalysis(invariant, noteContent, vibesidian);
        if (aiAnalysis) {
          return aiAnalysis;
        }
      }
    } catch (error) {
      console.log('AI analysis unavailable, falling back to rule-based checks:', error);
    }
    
    // Fall back to enhanced rule-based checks
    // Check based on invariant number
    switch (invariant.number) {
      case 1: // 복잡성 단순화 (Simplicity Over Complexity)
        // Check for structured content (headings, lists, tables)
        const hasHeadings = /^#{1,6}\s.+$/m.test(noteContent);
        const hasLists = /^[\s]*[-*+]\s.+$/m.test(noteContent) || /^[\s]*\d+\.\s.+$/m.test(noteContent);
        const hasTables = /\|.+\|/.test(noteContent);
        const hasCodeBlocks = /```[\s\S]*?```/.test(noteContent);
        const hasStructuredContent = hasHeadings || hasLists || hasTables || hasCodeBlocks;
        
        if (!hasStructuredContent) {
          return {
            invariantNumber: invariant.number,
            invariantName: invariant.name,
            description: invariant.principle,
            violationReason: "Note lacks structured content (headings, lists, tables, or code blocks)",
            suggestion: "Add structure to your note using headings, lists, tables, or other formatting to improve clarity and organization."
          };
        }
        
        // Check for excessive complexity
        const sections = noteContent.split(/#{2,}/g).length - 1;
        const paragraphs = noteContent.split(/\n\s*\n/).length;
        const avgParagraphLength = this.calculateAvgParagraphLength(noteContent);
        
        // Check for overly complex or overly simple content
        if (sections > 10 && avgParagraphLength > 200) {
          return {
            invariantNumber: invariant.number,
            invariantName: invariant.name,
            description: invariant.principle,
            violationReason: `Note appears too complex (${sections} sections, avg paragraph length: ${avgParagraphLength.toFixed(0)} chars)`,
            suggestion: "Consider simplifying the note by breaking it down into smaller, more focused notes."
          };
        }
        break;
        
      case 2: // 데이터 기반 객관성 (Data-Driven Objectivity)
        // Check for numerical data, statistics, citations
        const hasNumbers = /\d+([,.]\d+)?%?/.test(noteContent); // Numbers, including decimals and percentages
        const hasStatistics = /statistics|data|metrics|measurement|quantitative|analysis|study|research|evidence|survey|experiment/i.test(contentLower);
        const hasCitations = /\[\[.+?\]\]|\[.+?\]\(.+?\)|>\s.+?|^#+ Reference/m.test(noteContent); // Links, citations, blockquotes, reference section
        
        // Extended list of subjective terms
        const subjectiveTerms = [
          'I think', 'I believe', 'in my opinion', 'feel like', 'seems like', 'might be', 
          'could be', 'probably', 'possibly', 'maybe', 'perhaps', 'subjective', 
          '주관적', '생각', '느낌', '의견', '아마도'
        ];
        
        const hasSubjectiveLanguage = subjectiveTerms.some(term => contentLower.includes(term.toLowerCase()));
        const hasDataElements = hasNumbers || hasStatistics || hasCitations;
        
        if (hasSubjectiveLanguage && !hasDataElements) {
          return {
            invariantNumber: invariant.number,
            invariantName: invariant.name,
            description: invariant.principle,
            violationReason: "Note contains subjective language without supporting data or evidence",
            suggestion: "Add numerical data, statistics, research findings, or citations to support your claims and make them more objective."
          };
        }
        
        // Check if the note completely lacks data elements
        if (!hasDataElements && noteContent.length > 200) {
          return {
            invariantNumber: invariant.number,
            invariantName: invariant.name,
            description: invariant.principle,
            violationReason: "Note lacks any numerical data, statistics, or citations",
            suggestion: "Incorporate quantitative information, research findings, or references to make your note more data-driven."
          };
        }
        break;
        
      case 3: // 구조적 사고 (Root Cause Focus)
        // Check for problem-solution structure or logical flow
        const hasProblemStatement = /problem|issue|challenge|difficulty|question|문제|이슈|도전|질문/i.test(contentLower);
        const hasSolutionDiscussion = /solution|resolve|address|approach|strategy|answer|해결|방법|전략|답변/i.test(contentLower);
        const hasLogicalConnectors = /therefore|thus|because|since|as a result|consequently|if-then|leads to|causes|따라서|그러므로|왜냐하면|결과적으로|원인/i.test(contentLower);
        const hasStructuralThinking = /structure|system|pattern|framework|model|process|flow|구조|시스템|패턴|프레임워크|모델|프로세스/i.test(contentLower);
        
        const hasLogicalStructure = (hasProblemStatement && hasSolutionDiscussion) || hasLogicalConnectors || hasStructuralThinking;
        
        if (!hasLogicalStructure && noteContent.length > 200) {
          return {
            invariantNumber: invariant.number,
            invariantName: invariant.name,
            description: invariant.principle,
            violationReason: "Note lacks problem-solution structure or logical flow",
            suggestion: "Organize your note with a clear problem statement and solution approach, or use logical connectors to show relationships between ideas."
          };
        }
        break;
        
      case 4: // 실용주의 (Pragmatism)
        // Check for practical applications or action items
        const hasActionItems = /todo|action item|next steps|implement|apply|try|test|할 일|액션 아이템|다음 단계|구현|적용|시도|테스트/i.test(contentLower);
        const hasPracticalExamples = /example|case study|in practice|실제|예시|사례|실천/i.test(contentLower);
        const hasImplementationDetails = /how to|steps to|guide|tutorial|instructions|방법|단계|가이드|튜토리얼|지침/i.test(contentLower);
        const hasBulletPoints = /^[\s]*[-*+]\s.+$/m.test(noteContent); // Check for bullet points which often indicate action items
        
        const hasPracticalContent = hasActionItems || hasPracticalExamples || hasImplementationDetails || (hasBulletPoints && /do|make|create|implement|execute|수행|만들기|생성|구현|실행/i.test(contentLower));
        
        if (!hasPracticalContent && noteContent.length > 200) {
          return {
            invariantNumber: invariant.number,
            invariantName: invariant.name,
            description: invariant.principle,
            violationReason: "Note lacks practical applications or actionable items",
            suggestion: "Add specific action items, practical examples, or implementation steps to make your note more useful and applicable."
          };
        }
        break;
    }
    
    return null; // No violation found
  }
  
  /**
   * Uses AI to analyze if a note adheres to an invariant
   * @param invariant The invariant to check
   * @param noteContent The content of the note
   * @param vibesidian The Vibesidian plugin instance
   * @returns Promise<InvariantViolation | null> Violation if found, null otherwise
   */
  private async performAIAnalysis(
    invariant: { number: number; name: string; principle: string; description: string },
    noteContent: string,
    vibesidian: any
  ): Promise<InvariantViolation | null> {
    try {
      // Prepare a prompt for the AI to analyze the note against the invariant
      const prompt = `
Analyze the following note content against this invariant principle:

Invariant ${invariant.number}: ${invariant.name}
Principle: "${invariant.principle}"

Note Content:
"""
${noteContent.substring(0, 2000)} ${noteContent.length > 2000 ? '...(truncated)' : ''}
"""

Determine if the note violates the invariant. Focus on these specific criteria:

For Invariant 1 (복잡성 단순화/Simplicity Over Complexity):
- Does the note have structured content (headings, lists, tables)?
- Is the structure clear and organized?

For Invariant 2 (데이터 기반/Data-Driven):
- Does the note include numerical data, statistics, or citations?
- Are claims supported by evidence rather than just opinions?

For Invariant 3 (구조적 사고/Structural Thinking):
- Does the note have a problem-solution structure or logical flow?
- Does it address root causes rather than just symptoms?

For Invariant 4 (실용주의/Pragmatism):
- Does the note include practical applications or action items?
- Can the content be applied in real-world situations?

Respond with a JSON object with these fields:
- violates: true/false (whether the note violates the invariant)
- reason: (if violates is true, explain why)
- suggestion: (if violates is true, provide a specific suggestion to fix it)
`;

      // Call the AI to analyze the note
      const response = await vibesidian.generateText({
        prompt: prompt,
      });
      
      // Parse the AI response
      let analysisResult;
      try {
        // Extract JSON from the response if it's wrapped in text
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          analysisResult = JSON.parse(response.text);
        }
      } catch (error) {
        console.log('Failed to parse AI response as JSON:', error);
        console.log('AI response:', response.text);
        return null;
      }
      
      // Return a violation if the AI determined one exists
      if (analysisResult.violates) {
        return {
          invariantNumber: invariant.number,
          invariantName: invariant.name,
          description: invariant.principle,
          violationReason: analysisResult.reason || `AI detected a violation of invariant ${invariant.number}`,
          suggestion: analysisResult.suggestion || "Consider revising your note to better align with this invariant principle."
        };
      }
      
      return null; // No violation found by AI
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return null; // Fall back to rule-based checks
    }
  }

  /**
   * Calculates the average paragraph length in a note
   * @param content The note content
   * @returns number Average paragraph length in characters
   */
  private calculateAvgParagraphLength(content: string): number {
    const paragraphs = content.split(/\n\s*\n/);
    const totalLength = paragraphs.reduce((sum, p) => sum + p.length, 0);
    return totalLength / paragraphs.length;
  }

  /**
   * Displays a notice for invariant violations
   * @param violations Array of violations
   */
  showViolationsNotice(violations: InvariantViolation[]): void {
    if (violations.length === 0) return;
    
    const notice = new Notice(
      `⚠️ Note violates ${violations.length} invariant(s)`,
      10000 // 10 seconds
    );
    
    // Add a button to the notice to show details
    const noticeEl = notice.noticeEl;
    const detailsButton = noticeEl.createEl('button', {
      text: 'Show Details',
      cls: 'mod-cta'
    });
    
    // Store a reference to 'this' to use in the event listener
    const self = this;
    
    // Use a proper event handler that prevents the default action
    detailsButton.addEventListener('click', (event) => {
      // Prevent the default action (which closes the notice)
      event.preventDefault();
      event.stopPropagation();
      
      // Show the modal with violations
      self.showViolationsModal(violations);
      
      // Optionally close the notice after showing the modal
      notice.hide();
      
      return false;
    });
  }

  /**
   * Shows a modal with detailed information about violations
   * @param violations Array of violations
   */
  private showViolationsModal(violations: InvariantViolation[]): void {
    // Create a modal using Obsidian's Modal class
    const modal = new class ViolationsModal extends Modal {
      violations: InvariantViolation[];
      
      constructor(app: App, violations: InvariantViolation[]) {
        super(app);
        this.violations = violations;
      }
      
      onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Invariant Violations' });
        
        for (const violation of this.violations) {
          const violationEl = contentEl.createDiv({ cls: 'invariant-violation' });
          
          violationEl.createEl('h3', { 
            text: `불변량 ${violation.invariantNumber}: ${violation.invariantName}`,
            cls: 'invariant-title'
          });
          
          violationEl.createEl('p', { 
            text: `원칙: ${violation.description}`,
            cls: 'invariant-principle'
          });
          
          violationEl.createEl('p', { 
            text: `위반 사항: ${violation.violationReason}`,
            cls: 'invariant-violation-reason'
          });
          
          violationEl.createEl('p', { 
            text: `제안: ${violation.suggestion}`,
            cls: 'invariant-suggestion'
          });
        }
        
        const buttonContainer = contentEl.createDiv({ cls: 'button-container' });
        
        const closeButton = buttonContainer.createEl('button', {
          text: 'Close',
          cls: 'mod-cta'
        });
        
        closeButton.addEventListener('click', () => {
          this.close();
        });
      }
      
      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
    }(this.app, violations);
    
    modal.open();
  }
}

