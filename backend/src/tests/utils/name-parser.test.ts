/**
 * Tests for the name parser utility
 */

import { parseNameField, extractFirstName, extractLastName, extractAcademicTitle } from '../../utils/name-parser';

describe('Name Parser Utility', () => {
  describe('parseNameField', () => {
    test('should correctly parse simple name', () => {
      const result = parseNameField('John Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.academicTitle).toBeUndefined();
    });
    
    test('should handle empty input', () => {
      const result = parseNameField('');
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.confidence).toBe(0);
    });
    
    test('should handle single word names', () => {
      const result = parseNameField('Smith');
      expect(result.lastName).toBe('Smith');
      expect(result.confidence).toBeLessThan(0.9); // Lower confidence for ambiguous cases
    });
    
    test('should handle names with titles', () => {
      const result = parseNameField('Dr. Jane Smith');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.academicTitle).toBe('Dr.');
    });
    
    test('should handle compound first names', () => {
      const result = parseNameField('Jean-Pierre Dubois');
      expect(result.firstName).toBe('Jean-Pierre');
      expect(result.lastName).toBe('Dubois');
    });
    
    test('should handle last name with nobility prefix', () => {
      const result = parseNameField('Ludwig von Beethoven');
      expect(result.firstName).toBe('Ludwig');
      expect(result.lastName).toBe('von Beethoven');
    });
    
    test('should handle comma-separated format', () => {
      const result = parseNameField('Müller, Hans');
      expect(result.firstName).toBe('Hans');
      expect(result.lastName).toBe('Müller');
    });
    
    test('should handle multiple last names', () => {
      const result = parseNameField('Maria Garcia Rodriguez');
      expect(result.firstName).toBe('Maria');
      expect(result.lastName).toBe('Garcia Rodriguez');
    });
  });
  
  describe('German/Austrian academic titles', () => {
    test('should extract Dr. title at beginning', () => {
      const result = parseNameField('Dr. Thomas Weber');
      expect(result.firstName).toBe('Thomas');
      expect(result.lastName).toBe('Weber');
      expect(result.academicTitle).toBe('Dr.');
    });

    test('should extract Prof. Dr. title combination', () => {
      const result = parseNameField('Prof. Dr. Anna Schmidt');
      expect(result.firstName).toBe('Anna');
      expect(result.lastName).toBe('Schmidt');
      expect(result.academicTitle).toBe('Prof. Dr.');
    });

    test('should extract Dr. med. univ. title', () => {
      const result = parseNameField('Dr. med. univ. Michael Huber');
      expect(result.firstName).toBe('Michael');
      expect(result.lastName).toBe('Huber');
      expect(result.academicTitle).toBe('Dr. med. univ.');
    });

    test('should extract Dipl.-Ing. title', () => {
      const result = parseNameField('Dipl.-Ing. Stefan Müller');
      expect(result.firstName).toBe('Stefan');
      expect(result.lastName).toBe('Müller');
      expect(result.academicTitle).toBe('Dipl.-Ing.');
    });

    test('should extract Mag. title', () => {
      const result = parseNameField('Mag. Christina Bauer');
      expect(result.firstName).toBe('Christina');
      expect(result.lastName).toBe('Bauer');
      expect(result.academicTitle).toBe('Mag.');
    });

    test('should extract PhD title', () => {
      const result = parseNameField('PhD Sarah Connor');
      expect(result.firstName).toBe('Sarah');
      expect(result.lastName).toBe('Connor');
      expect(result.academicTitle).toBe('PhD');
    });

    test('should extract MSc title', () => {
      const result = parseNameField('MSc Martin Gruber');
      expect(result.firstName).toBe('Martin');
      expect(result.lastName).toBe('Gruber');
      expect(result.academicTitle).toBe('MSc');
    });

    test('should handle multiple titles with periods', () => {
      const result = parseNameField('Univ.Prof. Dr.phil. Robert Schneider');
      expect(result.firstName).toBe('Robert');
      expect(result.lastName).toBe('Schneider');
      // Either Univ.Prof. or Dr.phil. is fine, as long as we extract one of them
      expect(result.academicTitle).toBeTruthy();
    });

    test('should handle title after names', () => {
      const result = parseNameField('Hans Mayer, MBA');
      expect(result.firstName).toBe('Hans');
      expect(result.lastName).toBe('Mayer');
      expect(result.academicTitle).toBe('MBA');
    });

    test('should handle name with multiple parts and title', () => {
      const result = parseNameField('Dr. Karl-Heinz von der Hofen');
      expect(result.firstName).toBe('Karl-Heinz');
      expect(result.lastName).toBe('von der Hofen');
      expect(result.academicTitle).toBe('Dr.');
    });
  });
  
  describe('extractFirstName', () => {
    test('should extract first name only', () => {
      expect(extractFirstName('John Doe')).toBe('John');
      expect(extractFirstName('Dr. Jane Smith')).toBe('Jane');
    });
  });
  
  describe('extractLastName', () => {
    test('should extract last name only', () => {
      expect(extractLastName('John Doe')).toBe('Doe');
      expect(extractLastName('Ludwig von Beethoven')).toBe('von Beethoven');
    });
  });

  describe('extractAcademicTitle', () => {
    test('should extract academic title only', () => {
      expect(extractAcademicTitle('Dr. Jane Smith')).toBe('Dr.');
      expect(extractAcademicTitle('Prof. Dr. James Wilson')).toBe('Prof. Dr.');
      expect(extractAcademicTitle('John Doe')).toBeUndefined();
    });
  });
}); 