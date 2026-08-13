import { describe, it, expect } from 'bun:test';
import {
  validate,
  snowflakeSchema,
  emailSchema,
  urlSchema,
  usernameSchema,
  tagContentSchema,
  tagNameSchema,
} from '../../src/utils/validators/index.js';

describe('Validators', () => {
  describe('snowflakeSchema', () => {
    it('should validate Discord snowflakes', () => {
      expect(snowflakeSchema.safeParse('123456789012345678').success).toBe(true);
      expect(snowflakeSchema.safeParse('1234567890123456789').success).toBe(true);
      expect(snowflakeSchema.safeParse('12345678901234567').success).toBe(false);
      expect(snowflakeSchema.safeParse('abc1234567890123456').success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should validate email addresses', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('invalid-email').success).toBe(false);
      expect(emailSchema.safeParse('test@').success).toBe(false);
    });
  });

  describe('urlSchema', () => {
    it('should validate URLs', () => {
      expect(urlSchema.safeParse('https://example.com').success).toBe(true);
      expect(urlSchema.safeParse('http://example.com').success).toBe(true);
      expect(urlSchema.safeParse('not-a-url').success).toBe(false);
    });
  });

  describe('usernameSchema', () => {
    it('should validate usernames', () => {
      expect(usernameSchema.safeParse('username').success).toBe(true);
      expect(usernameSchema.safeParse('user_name').success).toBe(true);
      expect(usernameSchema.safeParse('ab').success).toBe(true);
      expect(usernameSchema.safeParse('a').success).toBe(false);
      expect(usernameSchema.safeParse('user name').success).toBe(false);
      expect(usernameSchema.safeParse('user@name').success).toBe(false);
    });
  });

  describe('tagContentSchema', () => {
    it('should validate tag content', () => {
      expect(tagContentSchema.safeParse('Hello World').success).toBe(true);
      expect(tagContentSchema.safeParse('').success).toBe(false);
      expect(tagContentSchema.safeParse('x'.repeat(2001)).success).toBe(false);
    });
  });

  describe('tagNameSchema', () => {
    it('should validate tag names', () => {
      expect(tagNameSchema.safeParse('my-tag').success).toBe(true);
      expect(tagNameSchema.safeParse('my_tag').success).toBe(true);
      expect(tagNameSchema.safeParse('mytag').success).toBe(true);
      expect(tagNameSchema.safeParse('my tag').success).toBe(false);
      expect(tagNameSchema.safeParse('my@tag').success).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate data against schema', () => {
      const result = validate(snowflakeSchema, '123456789012345678');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('123456789012345678');
      }
    });

    it('should return errors for invalid data', () => {
      const result = validate(snowflakeSchema, 'invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});