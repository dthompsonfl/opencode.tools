/**
 * Tests for Skill Registry
 */

import { SkillRegistry } from '../../../../src/cowork/registries/skill-registry';
import { SkillDefinition } from '../../../../src/cowork/types';

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = SkillRegistry.getInstance();
    registry.clear();
  });

  describe('register', () => {
    it('should register a skill', () => {
      const skill: SkillDefinition = {
        id: 'coding-skill',
        name: 'Coding Skill',
        body: 'You are a coding expert.'
      };

      registry.register(skill);

      expect(registry.has('coding-skill')).toBe(true);
      expect(registry.get('coding-skill')).toEqual(skill);
    });

    it('should override existing skill with same ID', () => {
      const skill1: SkillDefinition = {
        id: 'skill',
        name: 'Skill',
        body: 'First body'
      };

      const skill2: SkillDefinition = {
        id: 'skill',
        name: 'Skill',
        body: 'Second body'
      };

      registry.register(skill1);
      registry.register(skill2);

      expect(registry.get('skill')?.body).toBe('Second body');
    });
  });

  describe('registerMany', () => {
    it('should register multiple skills', () => {
      const skills: SkillDefinition[] = [
        { id: 'skill1', name: 'Skill 1', body: 'Body 1' },
        { id: 'skill2', name: 'Skill 2', body: 'Body 2' }
      ];

      registry.registerMany(skills);

      expect(registry.size()).toBe(2);
      expect(registry.has('skill1')).toBe(true);
      expect(registry.has('skill2')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return skill by ID', () => {
      const skill: SkillDefinition = {
        id: 'coding-skill',
        name: 'Coding Skill',
        body: 'You are a coding expert.'
      };

      registry.register(skill);

      expect(registry.get('coding-skill')).toEqual(skill);
    });

    it('should return undefined for non-existing ID', () => {
      expect(registry.get('non-existing')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered skills', () => {
      const skills: SkillDefinition[] = [
        { id: 'skill1', name: 'Skill 1', body: 'Body 1' },
        { id: 'skill2', name: 'Skill 2', body: 'Body 2' }
      ];

      registry.registerMany(skills);

      const result = registry.list();

      expect(result).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true for existing skill', () => {
      const skill: SkillDefinition = {
        id: 'coding-skill',
        name: 'Coding Skill',
        body: 'You are a coding expert.'
      };

      registry.register(skill);

      expect(registry.has('coding-skill')).toBe(true);
    });

    it('should return false for non-existing skill', () => {
      expect(registry.has('non-existing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all skills', () => {
      const skills: SkillDefinition[] = [
        { id: 'skill1', name: 'Skill 1', body: 'Body 1' },
        { id: 'skill2', name: 'Skill 2', body: 'Body 2' }
      ];

      registry.registerMany(skills);
      registry.clear();

      expect(registry.size()).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = SkillRegistry.getInstance();
      const instance2 = SkillRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
