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
var import_obsidian4 = require("obsidian");

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\noteScanner
var NoteScanner = class {
  constructor(vault) {
    __publicField(this, "vault");
    // 위키링크 정규식 패턴 - [[링크]] 또는 [[링크|표시텍스트]] 형식 모두 캡처
    __publicField(this, "WIKI_LINK_REGEX", /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
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
    console.log(`Found ${markdownFiles.length} markdown files in the vault`);
    return markdownFiles;
  }
  /**
   * Extracts wiki links from note content
   * @param content The note content to analyze
   * @returns string[] Array of link targets (paths or titles)
   */
  extractWikiLinks(content) {
    const links = [];
    let match;
    this.WIKI_LINK_REGEX.lastIndex = 0;
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
  resolveLinkTarget(linkTarget, allFiles) {
    const exactPathMatch = allFiles.find((f) => f.path === linkTarget || f.path === `${linkTarget}.md`);
    if (exactPathMatch) {
      return exactPathMatch.path;
    }
    const basenameMatch = allFiles.find((f) => f.basename === linkTarget);
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
  isIsolatedNote(file, allLinks) {
    const filePath = file.path;
    const hasOutgoingLinks = allLinks.has(filePath) && allLinks.get(filePath).length > 0;
    let hasIncomingLinks = false;
    for (const [source, targets] of allLinks.entries()) {
      if (source !== filePath && targets.includes(filePath)) {
        hasIncomingLinks = true;
        break;
      }
    }
    const isIsolated = !hasOutgoingLinks && !hasIncomingLinks;
    console.log(`Note ${filePath}: outgoing links: ${hasOutgoingLinks ? "YES" : "NO"}, incoming links: ${hasIncomingLinks ? "YES" : "NO"}, isolated: ${isIsolated ? "YES" : "NO"}`);
    return isIsolated;
  }
  /**
   * Gets all links in the vault
   * @returns Promise<Map<string, string[]>> Map of source files to target files
   */
  async getAllLinks() {
    console.log("Starting to analyze all links in the vault...");
    const linkMap = /* @__PURE__ */ new Map();
    const files = await this.getAllMarkdownFiles();
    for (const file of files) {
      try {
        const content = await this.vault.cachedRead(file);
        const extractedLinks = this.extractWikiLinks(content);
        console.log(`Found ${extractedLinks.length} raw links in ${file.path}`);
        const resolvedLinks = [];
        for (const link of extractedLinks) {
          const resolvedPath = this.resolveLinkTarget(link, files);
          if (resolvedPath) {
            resolvedLinks.push(resolvedPath);
          }
        }
        linkMap.set(file.path, resolvedLinks);
        console.log(`Resolved ${resolvedLinks.length} links in ${file.path}`);
      } catch (error) {
        console.error(`Error processing links in ${file.path}:`, error);
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
  async findIsolatedNotes() {
    console.log("Starting to find isolated notes...");
    const isolatedNotes = [];
    const files = await this.getAllMarkdownFiles();
    const allLinks = await this.getAllLinks();
    console.log(`Checking ${files.length} files for isolation...`);
    for (const file of files) {
      if (this.isIsolatedNote(file, allLinks)) {
        try {
          const content = await this.vault.cachedRead(file);
          isolatedNotes.push({
            file,
            title: file.basename,
            path: file.path,
            content,
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

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\invariantChecker
var import_obsidian = require("obsidian");
var InvariantChecker = class {
  constructor(app, invariantsFilePath) {
    __publicField(this, "app");
    __publicField(this, "invariantsFilePath");
    __publicField(this, "invariants", []);
    __publicField(this, "invariantsLoaded", false);
    this.app = app;
    this.invariantsFilePath = invariantsFilePath;
  }
  /**
   * Loads the invariants from the specified file
   * @returns Promise<boolean> Success status
   */
  async loadInvariants() {
    try {
      const invariantsFile = this.app.vault.getAbstractFileByPath(this.invariantsFilePath);
      if (!invariantsFile || !(invariantsFile instanceof import_obsidian.TFile)) {
        console.error(`Invariants file not found at ${this.invariantsFilePath}`);
        return false;
      }
      const content = await this.app.vault.read(invariantsFile);
      this.parseInvariants(content);
      this.invariantsLoaded = true;
      return true;
    } catch (error) {
      console.error("Error loading invariants:", error);
      return false;
    }
  }
  /**
   * Parses the invariants from the file content
   * @param content The content of the invariants file
   */
  parseInvariants(content) {
    this.invariants = [];
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
  async checkNoteAgainstInvariants(noteContent) {
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
    const violations = [];
    const violationPromises = this.invariants.map(
      (invariant) => this.checkInvariant(invariant, noteContent)
    );
    const violationResults = await Promise.all(violationPromises);
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
  async checkInvariant(invariant, noteContent) {
    try {
      const vibesidian = this.app.plugins.getPlugin("vibesidian");
      if (!vibesidian) {
        console.log("Vibesidian plugin not found, using rule-based checks only");
      }
      const violation = await this.simpleInvariantCheck(invariant, noteContent);
      return violation;
    } catch (error) {
      console.error("Error checking invariant:", error);
      return null;
    }
  }
  /**
   * Enhanced invariant check using more sophisticated analysis and AI assistance when available
   * @param invariant The invariant to check
   * @param noteContent The content of the note
   * @returns InvariantViolation | null Violation if found, null otherwise
   */
  async simpleInvariantCheck(invariant, noteContent) {
    const contentLower = noteContent.toLowerCase();
    try {
      const vibesidian = this.app.plugins.getPlugin("vibesidian");
      if (vibesidian) {
        const aiAnalysis = await this.performAIAnalysis(invariant, noteContent, vibesidian);
        if (aiAnalysis) {
          return aiAnalysis;
        }
      }
    } catch (error) {
      console.log("AI analysis unavailable, falling back to rule-based checks:", error);
    }
    switch (invariant.number) {
      case 1:
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
        const sections = noteContent.split(/#{2,}/g).length - 1;
        const paragraphs = noteContent.split(/\n\s*\n/).length;
        const avgParagraphLength = this.calculateAvgParagraphLength(noteContent);
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
      case 2:
        const hasNumbers = /\d+([,.]\d+)?%?/.test(noteContent);
        const hasStatistics = /statistics|data|metrics|measurement|quantitative|analysis|study|research|evidence|survey|experiment/i.test(contentLower);
        const hasCitations = /\[\[.+?\]\]|\[.+?\]\(.+?\)|>\s.+?|^#+ Reference/m.test(noteContent);
        const subjectiveTerms = [
          "I think",
          "I believe",
          "in my opinion",
          "feel like",
          "seems like",
          "might be",
          "could be",
          "probably",
          "possibly",
          "maybe",
          "perhaps",
          "subjective",
          "\uC8FC\uAD00\uC801",
          "\uC0DD\uAC01",
          "\uB290\uB08C",
          "\uC758\uACAC",
          "\uC544\uB9C8\uB3C4"
        ];
        const hasSubjectiveLanguage = subjectiveTerms.some((term) => contentLower.includes(term.toLowerCase()));
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
      case 3:
        const hasProblemStatement = /problem|issue|challenge|difficulty|question|문제|이슈|도전|질문/i.test(contentLower);
        const hasSolutionDiscussion = /solution|resolve|address|approach|strategy|answer|해결|방법|전략|답변/i.test(contentLower);
        const hasLogicalConnectors = /therefore|thus|because|since|as a result|consequently|if-then|leads to|causes|따라서|그러므로|왜냐하면|결과적으로|원인/i.test(contentLower);
        const hasStructuralThinking = /structure|system|pattern|framework|model|process|flow|구조|시스템|패턴|프레임워크|모델|프로세스/i.test(contentLower);
        const hasLogicalStructure = hasProblemStatement && hasSolutionDiscussion || hasLogicalConnectors || hasStructuralThinking;
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
      case 4:
        const hasActionItems = /todo|action item|next steps|implement|apply|try|test|할 일|액션 아이템|다음 단계|구현|적용|시도|테스트/i.test(contentLower);
        const hasPracticalExamples = /example|case study|in practice|실제|예시|사례|실천/i.test(contentLower);
        const hasImplementationDetails = /how to|steps to|guide|tutorial|instructions|방법|단계|가이드|튜토리얼|지침/i.test(contentLower);
        const hasBulletPoints = /^[\s]*[-*+]\s.+$/m.test(noteContent);
        const hasPracticalContent = hasActionItems || hasPracticalExamples || hasImplementationDetails || hasBulletPoints && /do|make|create|implement|execute|수행|만들기|생성|구현|실행/i.test(contentLower);
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
    return null;
  }
  /**
   * Uses AI to analyze if a note adheres to an invariant
   * @param invariant The invariant to check
   * @param noteContent The content of the note
   * @param vibesidian The Vibesidian plugin instance
   * @returns Promise<InvariantViolation | null> Violation if found, null otherwise
   */
  async performAIAnalysis(invariant, noteContent, vibesidian) {
    try {
      const prompt = `
Analyze the following note content against this invariant principle:

Invariant ${invariant.number}: ${invariant.name}
Principle: "${invariant.principle}"

Note Content:
"""
${noteContent.substring(0, 2e3)} ${noteContent.length > 2e3 ? "...(truncated)" : ""}
"""

Determine if the note violates the invariant. Focus on these specific criteria:

For Invariant 1 (\uBCF5\uC7A1\uC131 \uB2E8\uC21C\uD654/Simplicity Over Complexity):
- Does the note have structured content (headings, lists, tables)?
- Is the structure clear and organized?

For Invariant 2 (\uB370\uC774\uD130 \uAE30\uBC18/Data-Driven):
- Does the note include numerical data, statistics, or citations?
- Are claims supported by evidence rather than just opinions?

For Invariant 3 (\uAD6C\uC870\uC801 \uC0AC\uACE0/Structural Thinking):
- Does the note have a problem-solution structure or logical flow?
- Does it address root causes rather than just symptoms?

For Invariant 4 (\uC2E4\uC6A9\uC8FC\uC758/Pragmatism):
- Does the note include practical applications or action items?
- Can the content be applied in real-world situations?

Respond with a JSON object with these fields:
- violates: true/false (whether the note violates the invariant)
- reason: (if violates is true, explain why)
- suggestion: (if violates is true, provide a specific suggestion to fix it)
`;
      const response = await vibesidian.generateText({
        prompt
      });
      let analysisResult;
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          analysisResult = JSON.parse(response.text);
        }
      } catch (error) {
        console.log("Failed to parse AI response as JSON:", error);
        console.log("AI response:", response.text);
        return null;
      }
      if (analysisResult.violates) {
        return {
          invariantNumber: invariant.number,
          invariantName: invariant.name,
          description: invariant.principle,
          violationReason: analysisResult.reason || `AI detected a violation of invariant ${invariant.number}`,
          suggestion: analysisResult.suggestion || "Consider revising your note to better align with this invariant principle."
        };
      }
      return null;
    } catch (error) {
      console.error("Error in AI analysis:", error);
      return null;
    }
  }
  /**
   * Calculates the average paragraph length in a note
   * @param content The note content
   * @returns number Average paragraph length in characters
   */
  calculateAvgParagraphLength(content) {
    const paragraphs = content.split(/\n\s*\n/);
    const totalLength = paragraphs.reduce((sum, p) => sum + p.length, 0);
    return totalLength / paragraphs.length;
  }
  /**
   * Displays a notice for invariant violations
   * @param violations Array of violations
   */
  showViolationsNotice(violations) {
    if (violations.length === 0) return;
    const notice = new import_obsidian.Notice(
      `\u26A0\uFE0F Note violates ${violations.length} invariant(s)`,
      1e4
      // 10 seconds
    );
    const noticeEl = notice.noticeEl;
    const detailsButton = noticeEl.createEl("button", {
      text: "Show Details",
      cls: "mod-cta"
    });
    const self = this;
    detailsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      self.showViolationsModal(violations);
      notice.hide();
      return false;
    });
  }
  /**
   * Shows a modal with detailed information about violations
   * @param violations Array of violations
   */
  showViolationsModal(violations) {
    const modal = new class ViolationsModal extends import_obsidian.Modal {
      constructor(app, violations2) {
        super(app);
        __publicField(this, "violations");
        this.violations = violations2;
      }
      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Invariant Violations" });
        for (const violation of this.violations) {
          const violationEl = contentEl.createDiv({ cls: "invariant-violation" });
          violationEl.createEl("h3", {
            text: `\uBD88\uBCC0\uB7C9 ${violation.invariantNumber}: ${violation.invariantName}`,
            cls: "invariant-title"
          });
          violationEl.createEl("p", {
            text: `\uC6D0\uCE59: ${violation.description}`,
            cls: "invariant-principle"
          });
          violationEl.createEl("p", {
            text: `\uC704\uBC18 \uC0AC\uD56D: ${violation.violationReason}`,
            cls: "invariant-violation-reason"
          });
          violationEl.createEl("p", {
            text: `\uC81C\uC548: ${violation.suggestion}`,
            cls: "invariant-suggestion"
          });
        }
        const buttonContainer = contentEl.createDiv({ cls: "button-container" });
        const closeButton = buttonContainer.createEl("button", {
          text: "Close",
          cls: "mod-cta"
        });
        closeButton.addEventListener("click", () => {
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
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\settingsTab
var import_obsidian2 = require("obsidian");
var NoteConnectorSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Note Connector Settings" });
    containerEl.createEl("h3", { text: "Connection Settings" });
    new import_obsidian2.Setting(containerEl).setName("Minimum relevance score").setDesc("Only suggest connections with at least this relevance score (0-1)").addSlider((slider) => slider.setLimits(0, 1, 0.05).setValue(this.plugin.settings.minRelevanceScore).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.minRelevanceScore = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian2.Setting(containerEl).setName("Maximum suggestions per note").setDesc("Maximum number of suggestions to show for each isolated note").addSlider((slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.maxSuggestionsPerNote).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.maxSuggestionsPerNote = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian2.Setting(containerEl).setName("Create backlinks").setDesc("When adding a link to an isolated note, also add a backlink from the target note").addToggle((toggle) => toggle.setValue(this.plugin.settings.createBacklinks).onChange(async (value) => {
      this.plugin.settings.createBacklinks = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian2.Setting(containerEl).setName("Use AI for relevance analysis").setDesc("Use AI to analyze note relevance (requires Vibesidian plugin)").addToggle((toggle) => toggle.setValue(this.plugin.settings.useAIForRelevance).onChange(async (value) => {
      this.plugin.settings.useAIForRelevance = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Automation Settings" });
    new import_obsidian2.Setting(containerEl).setName("Scan on startup").setDesc("Automatically scan for isolated notes when Obsidian starts").addToggle((toggle) => toggle.setValue(this.plugin.settings.scanOnStartup).onChange(async (value) => {
      this.plugin.settings.scanOnStartup = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian2.Setting(containerEl).setName("Auto-trigger on save").setDesc("Automatically analyze and suggest connections when a new note is saved").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoTriggerOnSave).onChange(async (value) => {
      this.plugin.settings.autoTriggerOnSave = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Invariants Checking" });
    new import_obsidian2.Setting(containerEl).setName("Check invariants").setDesc("Check if new notes adhere to the 5 invariants principles").addToggle((toggle) => toggle.setValue(this.plugin.settings.checkInvariants).onChange(async (value) => {
      this.plugin.settings.checkInvariants = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian2.Setting(containerEl).setName("Invariants file path").setDesc("Path to the file containing the 5 invariants principles").addText((text) => text.setPlaceholder("3-Resources/0_Invariants.md").setValue(this.plugin.settings.invariantsFilePath).onChange(async (value) => {
      this.plugin.settings.invariantsFilePath = value;
      await this.plugin.saveSettings();
    }));
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\noteConnectorView
var import_obsidian3 = require("obsidian");
var NOTE_CONNECTOR_VIEW_TYPE = "note-connector-view";
var NoteConnectorView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "contentEl");
    __publicField(this, "isolatedNotes", []);
    __publicField(this, "singleNoteAnalysis", null);
    __publicField(this, "isLoading", false);
    __publicField(this, "viewMode", "isolated");
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
    (0, import_obsidian3.setIcon)(settingsButton, "settings");
    settingsButton.addEventListener("click", () => {
      this.plugin.openSettingsTab();
    });
    if (this.isLoading) {
      this.renderLoadingState();
    } else if (this.viewMode === "single" && this.singleNoteAnalysis) {
      this.renderSingleNoteAnalysis();
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
    this.viewMode = "isolated";
    const notesContainer = this.contentEl.createDiv({ cls: "note-connector-notes-container" });
    notesContainer.createEl("p", {
      text: `Found ${this.isolatedNotes.length} isolated notes in your vault.`,
      cls: "note-connector-summary"
    });
    for (const note of this.isolatedNotes) {
      this.renderNoteWithSuggestions(notesContainer, note);
    }
  }
  /**
   * Renders a single note analysis
   */
  renderSingleNoteAnalysis() {
    if (!this.singleNoteAnalysis) return;
    this.viewMode = "single";
    const container = this.contentEl.createDiv({ cls: "note-connector-single-note-container" });
    if (this.isolatedNotes.length > 0) {
      const backButton = container.createEl("button", {
        text: "Back to Isolated Notes",
        cls: "note-connector-back-button"
      });
      backButton.addEventListener("click", () => {
        this.viewMode = "isolated";
        this.renderView();
      });
    }
    container.createEl("p", {
      text: `Analyzing connections for "${this.singleNoteAnalysis.title}"`,
      cls: "note-connector-summary"
    });
    this.renderNoteWithSuggestions(container, this.singleNoteAnalysis);
  }
  /**
   * Renders a note with its suggestions
   * @param container The container element
   * @param note The note to render
   */
  renderNoteWithSuggestions(container, note) {
    const noteEl = container.createDiv({ cls: "note-connector-isolated-note" });
    const titleEl = noteEl.createEl("div", { cls: "note-connector-note-title" });
    titleEl.createEl("span", { text: note.title });
    const openButton = titleEl.createEl("button", {
      cls: "note-connector-open-button",
      attr: { "aria-label": "Open note" }
    });
    (0, import_obsidian3.setIcon)(openButton, "file-text");
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
        suggestionEl.createEl("div", {
          text: suggestion.relevanceReason,
          cls: "note-connector-suggestion-reason"
        });
        const actionsEl = suggestionEl.createDiv({ cls: "note-connector-suggestion-actions" });
        const connectButton = actionsEl.createEl("button", {
          cls: "note-connector-connect-button",
          attr: { "aria-label": "Connect notes" }
        });
        (0, import_obsidian3.setIcon)(connectButton, "link");
        connectButton.addEventListener("click", () => this.connectNotes(note, suggestion));
        const openSuggestionButton = actionsEl.createEl("button", {
          cls: "note-connector-open-suggestion-button",
          attr: { "aria-label": "Open note" }
        });
        (0, import_obsidian3.setIcon)(openSuggestionButton, "file-text");
        openSuggestionButton.addEventListener("click", () => this.openNote(suggestion.file));
      }
    } else {
      noteEl.createEl("div", {
        text: "No relevant connections found for this note.",
        cls: "note-connector-no-suggestions"
      });
    }
  }
  /**
   * Shows the analysis for a single note
   * @param note The analyzed note to show
   */
  showAnalyzedNote(note) {
    this.singleNoteAnalysis = note;
    this.viewMode = "single";
    this.renderView();
  }
  /**
   * Starts the scanning process
   */
  async startScan() {
    this.isLoading = true;
    this.renderView();
    try {
      this.isolatedNotes = await this.plugin.scanForIsolatedNotes();
      new import_obsidian3.Notice(`Found ${this.isolatedNotes.length} isolated notes`);
      this.viewMode = "isolated";
    } catch (error) {
      console.error("Error scanning for isolated notes:", error);
      new import_obsidian3.Notice("Error scanning for isolated notes");
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
        new import_obsidian3.Notice(`Connected "${sourceNote.title}" to "${targetSuggestion.title}"`);
        sourceNote.suggestions = sourceNote.suggestions.filter(
          (suggestion) => suggestion.path !== targetSuggestion.path
        );
        this.renderView();
      } else {
        new import_obsidian3.Notice("Failed to connect notes");
      }
    } catch (error) {
      console.error("Error connecting notes:", error);
      new import_obsidian3.Notice("Error connecting notes");
    }
  }
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\types
var DEFAULT_SETTINGS = {
  minRelevanceScore: 0.3,
  maxSuggestionsPerNote: 5,
  scanOnStartup: false,
  createBacklinks: true,
  useAIForRelevance: true,
  autoTriggerOnSave: true,
  checkInvariants: true,
  invariantsFilePath: "3-Resources/0_Invariants.md"
};

// obsidian-fs:C:\Users\win10_original\claude-vault\.obsidian\plugins\vibe-note-connector\main.ts
var NoteConnectorPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "noteScanner");
    __publicField(this, "noteAnalyzer");
    __publicField(this, "invariantChecker");
    __publicField(this, "fileModifyEventRef");
  }
  async onload() {
    await this.loadSettings();
    console.log("Note Connector settings loaded:", {
      autoTriggerOnSave: this.settings.autoTriggerOnSave,
      checkInvariants: this.settings.checkInvariants,
      invariantsFilePath: this.settings.invariantsFilePath
    });
    this.noteScanner = new NoteScanner(this.app.vault);
    this.noteAnalyzer = new NoteAnalyzer(this.app, this.settings);
    this.invariantChecker = new InvariantChecker(this.app, this.settings.invariantsFilePath);
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
    this.addCommand({
      id: "check-note-invariants",
      name: "Check Current Note Against Invariants",
      editorCallback: async (editor, view) => {
        if (view.file) {
          await this.checkNoteInvariants(view.file);
        }
      }
    });
    this.addCommand({
      id: "analyze-current-note",
      name: "Analyze Current Note for Connections",
      editorCallback: async (editor, view) => {
        if (view.file) {
          await this.analyzeNoteForConnections(view.file);
        }
      }
    });
    this.registerFileEvents();
    this.addSettingTab(new NoteConnectorSettingTab(this.app, this));
    this.invariantChecker.loadInvariants();
    console.log("Note Connector plugin loaded");
  }
  onunload() {
    this.app.vault.offref(this.fileModifyEventRef);
    this.app.workspace.detachLeavesOfType(NOTE_CONNECTOR_VIEW_TYPE);
    console.log("Note Connector plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.invariantChecker = new InvariantChecker(this.app, this.settings.invariantsFilePath);
    await this.invariantChecker.loadInvariants();
    console.log("Settings saved, auto-trigger is now:", this.settings.autoTriggerOnSave);
  }
  /**
   * Registers event handlers for file modifications
   */
  registerFileEvents() {
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof import_obsidian4.TFile && file.extension === "md") {
          if (this.settings.autoTriggerOnSave) {
            setTimeout(async () => {
              await this.processModifiedNote(file);
            }, 500);
          }
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (file instanceof import_obsidian4.TFile && file.extension === "md") {
          if (this.settings.autoTriggerOnSave) {
            setTimeout(async () => {
              await this.processModifiedNote(file);
            }, 500);
          }
        }
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", async (file) => {
        if (file instanceof import_obsidian4.TFile && file.extension === "md") {
          if (this.settings.autoTriggerOnSave) {
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
  async processModifiedNote(file) {
    console.log(`Processing modified note: ${file.path}, auto-trigger: ${this.settings.autoTriggerOnSave}, check invariants: ${this.settings.checkInvariants}`);
    if (this.settings.checkInvariants) {
      console.log(`Checking invariants for: ${file.path}`);
      const violations = await this.checkNoteInvariants(file);
      console.log(`Found ${violations.length} invariant violations`);
    }
    console.log(`Analyzing connections for: ${file.path}`);
    await this.analyzeNoteForConnections(file);
  }
  /**
   * Checks if a note adheres to the invariants
   * @param file The note file to check
   */
  async checkNoteInvariants(file) {
    try {
      console.log(`Starting invariant check for file: ${file.path}`);
      const content = await this.app.vault.read(file);
      console.log(`Read ${content.length} characters from file`);
      console.log(`Checking against invariants from: ${this.settings.invariantsFilePath}`);
      const violations = await this.invariantChecker.checkNoteAgainstInvariants(content);
      console.log(`Invariant check complete. Found ${violations.length} violations`);
      if (violations.length > 0) {
        console.log("Showing violations notice");
        this.invariantChecker.showViolationsNotice(violations);
      }
      return violations;
    } catch (error) {
      console.error("Error checking note invariants:", error);
      new import_obsidian4.Notice("Error checking note invariants");
      return [];
    }
  }
  /**
   * Analyzes a note for potential connections
   * @param file The note file to analyze
   */
  async analyzeNoteForConnections(file) {
    try {
      const allFiles = await this.noteScanner.getAllMarkdownFiles();
      const content = await this.app.vault.read(file);
      const noteInfo = {
        file,
        title: file.basename,
        path: file.path,
        content,
        suggestions: []
      };
      const analyzedNote = await this.noteAnalyzer.analyzeNote(noteInfo, allFiles);
      if (analyzedNote.suggestions.length > 0) {
        const notice = new import_obsidian4.Notice(
          `Found ${analyzedNote.suggestions.length} potential connections for "${file.basename}"`,
          8e3
          // 8 seconds
        );
        const noticeEl = notice.noticeEl;
        const viewButton = noticeEl.createEl("button", {
          text: "View Connections",
          cls: "mod-cta"
        });
        viewButton.addEventListener("click", async () => {
          await this.activateView();
          const view = this.getView();
          if (view) {
            view.showAnalyzedNote(analyzedNote);
          }
        });
      }
    } catch (error) {
      console.error("Error analyzing note for connections:", error);
    }
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
      new import_obsidian4.Notice("Error scanning for isolated notes");
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
