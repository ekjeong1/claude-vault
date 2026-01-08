import { TFile } from 'obsidian';

export interface NoteInfo {
  file: TFile;
  title: string;
  path: string;
  content: string;
  suggestions: NoteSuggestion[];
}

export interface NoteSuggestion {
  file: TFile;
  title: string;
  path: string;
  relevanceScore: number;
  relevanceReason: string;
}

export interface NoteConnectorSettings {
  minRelevanceScore: number;
  maxSuggestionsPerNote: number;
  scanOnStartup: boolean;
  createBacklinks: boolean;
  useAIForRelevance: boolean;
}

export const DEFAULT_SETTINGS: NoteConnectorSettings = {
  minRelevanceScore: 0.3,
  maxSuggestionsPerNote: 5,
  scanOnStartup: false,
  createBacklinks: true,
  useAIForRelevance: true
};