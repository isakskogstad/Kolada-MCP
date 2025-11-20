import { describe, it, expect } from 'vitest';
import { analysisPrompts, generatePromptText } from '../../src/prompts/analysis-prompts';

describe('Analysis Prompts', () => {
  describe('analysisPrompts', () => {
    it('should have all expected prompts', () => {
      expect(analysisPrompts).toHaveProperty('analyze_municipality');
      expect(analysisPrompts).toHaveProperty('compare_municipalities');
      expect(analysisPrompts).toHaveProperty('trend_analysis');
      expect(analysisPrompts).toHaveProperty('find_schools');
      expect(analysisPrompts).toHaveProperty('regional_comparison');
      expect(analysisPrompts).toHaveProperty('kpi_discovery');
    });

    it('should have proper prompt structure', () => {
      const prompt = analysisPrompts.analyze_municipality;

      expect(prompt.name).toBe('analyze_municipality');
      expect(prompt.description).toBeTruthy();
      expect(Array.isArray(prompt.arguments)).toBe(true);
      expect(prompt.arguments.length).toBeGreaterThan(0);
    });
  });

  describe('generatePromptText', () => {
    it('should generate text for analyze_municipality', () => {
      const prompt = analysisPrompts.analyze_municipality;
      const text = generatePromptText(prompt, {
        municipality_name: 'Stockholm',
        focus_areas: 'education'
      });

      expect(text).toContain('Stockholm');
      expect(text).toContain('education');
      expect(text).toContain('search_municipalities');
    });

    it('should generate text for compare_municipalities', () => {
      const prompt = analysisPrompts.compare_municipalities;
      const text = generatePromptText(prompt, {
        municipalities: 'Stockholm, Göteborg',
        kpi_topics: 'schools'
      });

      expect(text).toContain('Stockholm');
      expect(text).toContain('Göteborg');
      expect(text).toContain('schools');
      expect(text).toContain('compare_municipalities');
    });

    it('should handle missing arguments gracefully', () => {
      const prompt = analysisPrompts.trend_analysis;
      const text = generatePromptText(prompt, {});

      expect(text).toBeTruthy();
      expect(text).toContain('get_kpi_trend');
    });
  });
});
