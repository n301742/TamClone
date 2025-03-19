/**
 * name-parser.ts
 * Utility functions for parsing names into first name and last name components
 * Uses a hybrid approach with library parsing, custom rules, and confidence scoring
 */

import { parseFullName } from 'parse-full-name';

// Interface for parsed name result
export interface ParsedNameResult {
  firstName: string;
  lastName: string;
  confidence: number; // 0-1 score, where 1 is highest confidence
  possibleIssue?: string; // Description of any potential issues detected
  academicTitle?: string; // Extracted academic title
}

// Define types
export interface ParsedName {
  title: string;
  firstName: string;
  lastName: string;
  middleName: string;
  fullName: string;
  academicTitle: string;
  confidence: number;
  issues: string[];
}

/**
 * Academic titles and degrees common in German-speaking countries (Austria, Germany)
 * Including variations with and without periods
 */
const ACADEMIC_TITLES = {
  // Bachelor degrees
  bachelor: ['BA', 'B.A.', 'BEng', 'B.Eng.', 'BSc', 'B.Sc.'],
  
  // Master and diploma degrees
  master: [
    'MA', 'M.A.', 'MSc', 'M.Sc.', 'MBA', 'M.B.A.', 
    'MPH', 'M.P.H.', 'LLM', 'LL.M.', 'MBL', 'M.B.L.',
    'MMag', 'MMag.', 'M.Mag.'
  ],
  
  // Diplom degrees (traditional German/Austrian degrees)
  diplom: [
    'Dipl.-Ing.', 'DI', 'D.I.', 'Dipl.Ing.', 
    'Dipl.-Kfm.', 'Dipl.-Psych.', 'Dipl.-Wirt.Ing.',
    'Dipl.Arch.', 'Dipl.-Arch.'
  ],
  
  // Doctor titles
  doctor: [
    'Dr.', 'Dr', 'PhD', 'Ph.D.', 
    'Dr.med.', 'Dr. med.', 'Dr.med.univ.', 'Dr. med. univ.',
    'Dr.rer.nat.', 'Dr. rer. nat.', 'Dr.phil.', 'Dr. phil.', 
    'Dr.iur.', 'Dr. iur.', 'Dr.jur.', 'Dr. jur.',
    'Dr.rer.soc.oec.', 'Dr. rer. soc. oec.',
    'Dr.techn.', 'Dr. techn.', 'Dr.mont.', 'Dr. mont.',
    'DDr.', 'DDr', 'Dr.Dr.', 'Dr. Dr.'
  ],
  
  // Medical and specialized titles
  medical: [
    'med.', 'med. univ.', 'med.univ.', 'rer.nat.', 'phil.', 'iur.', 'jur.', 
    'rer.soc.oec.', 'techn.', 'mont.',
    'Prim.', 'Prim', 'Primararzt', 'Primarärztin'
  ],
  
  // Magister (common in Austria)
  magister: [
    'Mag.', 'Mag', 'M.A.G.', 
    'Mag.rer.nat.', 'Mag. rer. nat.', 
    'Mag.phil.', 'Mag. phil.',
    'Mag.iur.', 'Mag. iur.', 
    'Mag.art.', 'Mag. art.'
  ],
  
  // Common German/Austrian honorifics
  honorific: [
    'Prof.', 'Prof', 'Professor', 
    'Prof. Dr.', 'Prof.Dr.', 'Prof Dr',
    'Univ.Prof.', 'Univ.-Prof.', 'Univ. Prof.', 
    'Univ.Prof. Dr.', 'Univ.-Prof. Dr.', 'Univ. Prof. Dr.',
    'Univ.Doz.', 'Univ.-Doz.', 'Univ. Doz.',
    'PD', 'PD Dr.', 'P.D. Dr.', 'Priv.-Doz.', 'Priv.-Doz. Dr.',
    'FH-Prof.', 'FH-Prof', 'FH Prof.'
  ]
};

// Create a map of academic titles that could be confused with names
const ACADEMIC_TITLE_VARIATIONS = new Map<string, string>();

// Populate the normalized title variations map
// This helps with handling variations like "Dr" vs "Dr."
for (const category in ACADEMIC_TITLES) {
  for (const title of ACADEMIC_TITLES[category as keyof typeof ACADEMIC_TITLES]) {
    // Store the canonical form (with periods) and the normalized form (without periods)
    const normalized = title.replace(/\./g, '').toLowerCase();
    ACADEMIC_TITLE_VARIATIONS.set(normalized, title);
  }
}

// All academic titles flattened into a single array
const ALL_ACADEMIC_TITLES = [
  ...ACADEMIC_TITLES.bachelor,
  ...ACADEMIC_TITLES.master,
  ...ACADEMIC_TITLES.diplom,
  ...ACADEMIC_TITLES.doctor,
  ...ACADEMIC_TITLES.medical,
  ...ACADEMIC_TITLES.magister,
  ...ACADEMIC_TITLES.honorific
];

/**
 * Parses a full name string into first name and last name components
 * @param fullName - The full name to parse (e.g. "John Doe", "Dr. Jane Smith", etc.)
 * @returns ParsedNameResult with firstName, lastName, and confidence score
 */
export function parseNameField(fullName: string): ParsedNameResult {
  if (!fullName || typeof fullName !== 'string') {
    return {
      firstName: '',
      lastName: '',
      confidence: 0,
      possibleIssue: 'Empty or invalid name provided'
    };
  }

  // Normalize the input string: trim spaces and handle multiple spaces
  const normalizedName = fullName.trim().replace(/\s+/g, ' ');
  
  // Try to use library parsing first
  const parsedResult = parseFullName(normalizedName);
  
  // Apply custom rules for specific cases
  const result = applyCustomRules(parsedResult, normalizedName);
  
  // Calculate confidence based on patterns
  const confidence = calculateConfidence(result, normalizedName);
  
  return {
    firstName: result.firstName,
    lastName: result.lastName,
    confidence,
    possibleIssue: result.possibleIssue,
    academicTitle: result.academicTitle
  };
}

/**
 * Applies custom rules to improve name parsing for specific cases
 */
function applyCustomRules(
  libraryResult: any, 
  originalName: string
): { firstName: string; lastName: string; possibleIssue?: string; academicTitle?: string } {
  // Initialize with library's parse result
  let firstName = libraryResult.first || '';
  let lastName = libraryResult.last || '';
  let possibleIssue: string | undefined;
  let academicTitle: string | undefined;
  
  // Extract academic titles first (they can appear at the beginning or between names)
  const { nameWithoutTitles, academicTitles } = extractAcademicTitles(originalName);
  
  if (academicTitles.length > 0) {
    academicTitle = academicTitles.join(' ');
    
    // Re-parse the name without academic titles
    const reParsed = parseFullName(nameWithoutTitles);
    firstName = reParsed.first || firstName;
    lastName = reParsed.last || lastName;
    possibleIssue = 'Extracted academic title';
  }
  
  // RULE 1: Handle empty results from library
  if (!firstName && !lastName && nameWithoutTitles) {
    const parts = nameWithoutTitles.split(' ');
    if (parts.length === 1) {
      // Single word - assume last name
      lastName = parts[0];
      possibleIssue = 'Single word name provided, assumed to be last name';
    } else {
      // Multiple words - assume first word is first name, rest is last name
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
  }
  
  // RULE 2: Handle titles and prefixes that might confuse the parser
  const commonTitles = ['herr', 'frau'];
  const nameLower = nameWithoutTitles.toLowerCase();
  
  for (const title of commonTitles) {
    if (nameLower.startsWith(`${title} `) || nameLower.startsWith(`${title}. `)) {
      const nameWithoutTitle = nameWithoutTitles.substring(nameWithoutTitles.indexOf(' ') + 1).trim();
      const simpleParse = parseFullName(nameWithoutTitle);
      firstName = simpleParse.first || firstName;
      lastName = simpleParse.last || lastName;
      possibleIssue = possibleIssue || `Detected and removed title: ${title}`;
      break;
    }
  }
  
  // RULE 3: Handle compound names with common German/European patterns
  // Example: "Hans-Peter Mueller" should split to "Hans-Peter" and "Mueller"
  // Example: "Mueller-Schmidt, Hans" should split to "Hans" and "Mueller-Schmidt"
  // Example: "Weber, Prof. Dr. med. Karl-Heinz" should split to "Karl-Heinz" and "Weber" with "Prof. Dr. med." as academic title
  // Example: "Schmidt, MBA, Maria" should split to "Maria" and "Schmidt" with "MBA" as academic title
  if (nameWithoutTitles.includes(',')) {
    const parts = nameWithoutTitles.split(',').map(p => p.trim());
    
    // Handle cases with multiple commas
    if (parts.length > 2) {
      // Assume first part is the last name
      lastName = parts[0];
      
      // Temporary storage for potential titles and name components
      const potentialTitles: string[] = [];
      const nameComponents: string[] = [];
      
      // Process all parts after the first comma
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        
        // Check if this part is a known academic title
        // First check if it exactly matches a known title
        let isTitleMatch = ALL_ACADEMIC_TITLES.includes(part);
        
        // If not an exact match, try normalized matching
        if (!isTitleMatch) {
          isTitleMatch = ALL_ACADEMIC_TITLES.some(title => {
            const normalizedTitle = title.replace(/\./g, '').toLowerCase();
            const normalizedPart = part.replace(/\./g, '').toLowerCase();
            return normalizedTitle === normalizedPart;
          });
        }
        
        // Also check for common title prefixes (Prof, Dr, etc.)
        if (!isTitleMatch) {
          const titlePrefixes = ['Prof', 'Dr', 'Mag', 'Dipl', 'BA', 'MA', 'MBA', 'PhD'];
          isTitleMatch = titlePrefixes.some(prefix => part.startsWith(prefix));
        }
        
        // If it looks like a title, add to potential titles
        if (isTitleMatch) {
          potentialTitles.push(part);
        } 
        // Otherwise assume it's part of the name
        else {
          nameComponents.push(part);
        }
      }
      
      // Join the academic titles we found
      if (potentialTitles.length > 0) {
        academicTitle = (academicTitle ? academicTitle + ' ' : '') + potentialTitles.join(' ');
      }
      
      // If we have name components, use them for the first name
      if (nameComponents.length > 0) {
        firstName = nameComponents.join(' ');
      } 
      // If no name components but we have potential titles, use the last part as first name
      // This handles cases where we might have incorrectly classified a name as a title
      else if (potentialTitles.length > 0) {
        firstName = parts[parts.length - 1];
      }
      
      possibleIssue = possibleIssue || 'Name contained multiple commas, parsed as "LastName, Title(s), FirstName"';
    }
    // Simple case: LastName, FirstName or FullName, Title
    else if (parts.length === 2) {
      // Check if the second part is a known academic title
      const secondPart = parts[1].trim();
      
      // Check if the second part is a common first name rather than a title
      const commonFirstNames = ['Maria', 'Anna', 'Thomas', 'Hans', 'Peter', 'Klaus', 'Eva', 'Karl', 'Max', 'Johannes', 'Michael', 'Andreas', 'Stefan', 'Julia', 'Sarah', 'Laura'];
      if (commonFirstNames.includes(secondPart)) {
        // This is "LastName, FirstName" format with a common first name
        lastName = parts[0];
        firstName = secondPart;
        possibleIssue = 'Name contained comma, assumed format: "LastName, FirstName"';
        return { firstName, lastName, possibleIssue };
      }
      
      let isSecondPartTitle = ALL_ACADEMIC_TITLES.includes(secondPart);
      
      // If not an exact match, try normalized matching
      if (!isSecondPartTitle) {
        isSecondPartTitle = ALL_ACADEMIC_TITLES.some(title => {
          const normalizedTitle = title.replace(/\./g, '').toLowerCase();
          const normalizedPart = secondPart.replace(/\./g, '').toLowerCase();
          return normalizedTitle === normalizedPart;
        });
      }
      
      // Also check for common title prefixes (Prof, Dr, etc.)
      if (!isSecondPartTitle) {
        const titlePrefixes = ['Prof', 'Dr', 'Mag', 'Dipl', 'BA', 'MA', 'MBA', 'PhD'];
        isSecondPartTitle = titlePrefixes.some(prefix => 
          secondPart.startsWith(prefix) || secondPart.toLowerCase().startsWith(prefix.toLowerCase())
        );
      }
      
      if (isSecondPartTitle) {
        // This is "FullName, Title" format
        // Try to split the first part into first and last name
        const nameParts = parts[0].trim().split(/\s+/);
        if (nameParts.length >= 2) {
          firstName = nameParts.slice(0, -1).join(' ');
          lastName = nameParts[nameParts.length - 1];
        } else {
          // Single word name, assume it's lastName
          lastName = parts[0];
        }
        academicTitle = secondPart;
        possibleIssue = 'Name contained comma, interpreted as "FullName, AcademicTitle" format';
      } else {
        // This is "LastName, FirstName" format
        lastName = parts[0];
        
        // Extract academic titles from the part after the comma
        const afterCommaResult = extractAcademicTitles(parts[1]);
        
        if (afterCommaResult.academicTitles.length > 0) {
          academicTitle = afterCommaResult.academicTitles.join(' ');
          firstName = afterCommaResult.nameWithoutTitles;
        } else {
          firstName = parts[1];
        }
        
        possibleIssue = 'Name contained comma, assumed format: "LastName, FirstName"';
      }
      
      return { firstName, lastName, possibleIssue, academicTitle };
    }
  }
  
  // RULE 4: Handle common German name patterns with von/van/von der/etc.
  const nobilityPrefixes = ['von', 'van', 'de', 'von der', 'van der', 'zu'];
  for (const prefix of nobilityPrefixes) {
    const prefixPattern = new RegExp(`\\b${prefix}\\b`, 'i');
    if (nameWithoutTitles.match(prefixPattern) && !lastName.match(prefixPattern)) {
      // If we have "FirstName von LastName" pattern
      const parts = nameWithoutTitles.split(' ');
      const prefixPos = parts.findIndex(p => p.toLowerCase() === prefix);
      
      if (prefixPos > 0 && prefixPos < parts.length - 1) {
        firstName = parts.slice(0, prefixPos).join(' ');
        lastName = parts.slice(prefixPos).join(' ');
        possibleIssue = possibleIssue || `Detected nobility prefix: ${prefix}`;
      }
    }
  }
  
  // RULE 5: Handle hyphenated first names
  if (firstName.includes('-')) {
    // This is likely a compound first name (e.g., Jean-Pierre)
    possibleIssue = possibleIssue || 'Detected hyphenated first name';
  }
  
  // RULE 6: Handle multiple word last names (Spanish/Portuguese style: Maria Garcia Rodriguez)
  if (!possibleIssue && nameWithoutTitles.split(' ').length > 2) {
    const parts = nameWithoutTitles.split(' ');
    // Check if we have 3+ parts and first name is short (likely single name)
    if (parts.length >= 3 && firstName.length < 10) {
      // Common in Spanish/Portuguese names: First Middle Last or First LastName1 LastName2
      // Re-parse to ensure proper handling
      firstName = parts[0]; // First name is likely the first part
      lastName = parts.slice(1).join(' '); // Join the rest as last name(s)
      possibleIssue = possibleIssue || 'Detected potential multiple-word last name pattern';
    }
  }
  
  return { firstName, lastName, possibleIssue, academicTitle };
}

/**
 * Extract academic titles from a name and return the name without titles and the extracted titles
 * 
 * @param name The full name including potential academic titles
 * @returns Object containing the name without titles and the array of extracted titles
 */
export function extractAcademicTitles(name: string): { 
  nameWithoutTitles: string;
  academicTitles: string[];
} {
  if (!name) {
    return { nameWithoutTitles: '', academicTitles: [] };
  }

  let nameWithoutTitles = name.trim();
  const academicTitles: string[] = [];
  
  // Sort titles by length (descending) to avoid partial matches
  // (e.g., "Dr." being matched in "Dr. med.")
  const sortedTitles = [...ALL_ACADEMIC_TITLES].sort((a, b) => b.length - a.length);
  
  // Check for comma-separated titles at the end of the name
  // e.g., "Hans Mayer, MBA" or "Max Müller, Dipl.-Ing."
  const commaMatch = nameWithoutTitles.match(/,(.*?)$/);
  if (commaMatch) {
    const partAfterComma = commaMatch[1].trim();
    
    // Check if the part after the comma is a recognized title
    if (sortedTitles.some(title => {
      const normalized = title.replace(/\./g, '').toLowerCase();
      return partAfterComma.replace(/\./g, '').toLowerCase() === normalized;
    })) {
      academicTitles.push(partAfterComma);
      nameWithoutTitles = nameWithoutTitles.substring(0, nameWithoutTitles.lastIndexOf(',')).trim();
    }
  }
  
  // Extract consecutive titles from the beginning of the name
  let hasExtractedTitles = true;
  let titleExtractedCount = 0;
  const maxTitleExtraction = 5; // Safety limit to prevent infinite loops
  
  while (hasExtractedTitles && titleExtractedCount < maxTitleExtraction) {
    hasExtractedTitles = false;
    
    // First try to match longer patterns that include multiple words
    const medicalPatterns = [
      /^Dr\.\s*med\.\s*univ\./i,
      /^med\.\s*univ\./i,
      /^Dr\.\s*med\./i
    ];
    
    let foundMedicalPattern = false;
    for (const pattern of medicalPatterns) {
      const match = nameWithoutTitles.match(pattern);
      if (match) {
        academicTitles.push(match[0].trim());
        nameWithoutTitles = nameWithoutTitles.substring(match[0].length).trim();
        hasExtractedTitles = true;
        titleExtractedCount++;
        foundMedicalPattern = true;
        break;
      }
    }
    
    if (!foundMedicalPattern) {
      for (const title of sortedTitles) {
        // Create regex patterns that match the title at the beginning of the name,
        // ensuring it's followed by whitespace or end of string
        const escapedTitle = title.replace(/\./g, '\\.').replace(/\-/g, '\\-');
        const regexAtStart = new RegExp(`^${escapedTitle}(?:\\s+|$)`, 'i');
        
        if (regexAtStart.test(nameWithoutTitles)) {
          const match = nameWithoutTitles.match(regexAtStart);
          if (match) {
            academicTitles.push(title);
            nameWithoutTitles = nameWithoutTitles.substring(match[0].length).trim();
            hasExtractedTitles = true;
            titleExtractedCount++;
            break;
          }
        }
      }
    }
  }
  
  // Special handling for complex academic titles
  if (academicTitles.length > 0) {
    // Check if we have any remaining title-like patterns in the name
    const remainingTitlePatterns = [
      /^Prim\.?\s*/i,
      /^Univ\.?\s*-?\s*Prof\.?\s*/i,
      /^DDr\.?\s*/i,
      /^Dr\.?\s*/i,
      /^Prof\.?\s*/i,
      /^med\.?\s*univ\.?\s*/i
    ];
    
    for (const pattern of remainingTitlePatterns) {
      if (pattern.test(nameWithoutTitles)) {
        const match = nameWithoutTitles.match(pattern);
        if (match) {
          const title = match[0].trim();
          // Only add if it's not already in our academic titles
          if (!academicTitles.includes(title)) {
            academicTitles.push(title);
          }
          nameWithoutTitles = nameWithoutTitles.substring(match[0].length).trim();
        }
      }
    }
  }
  
  return {
    nameWithoutTitles,
    academicTitles,
  };
}

/**
 * Calculate confidence score for a parsed name
 */
function calculateConfidence(
  result: { firstName: string; lastName: string; possibleIssue?: string; academicTitle?: string }, 
  originalName: string
): number {
  let score = 1.0; // Start with perfect confidence
  
  // Penalty factors
  if (!result.firstName || !result.lastName) {
    score -= 0.3; // Major penalty for missing either first or last name
  }
  
  if (result.possibleIssue && !result.possibleIssue.includes('academic title')) {
    score -= 0.1; // Small penalty for any detected issues except academic title extraction
  }
  
  // Check if original words are preserved in the parsed result
  // For this check, we should consider the name without academic titles
  const { nameWithoutTitles } = extractAcademicTitles(originalName);
  const originalWords = nameWithoutTitles.toLowerCase().split(/\s+/);
  const resultWords = `${result.firstName} ${result.lastName}`.toLowerCase().split(/\s+/);
  
  // Count words from original that appear in result
  const wordPreservation = originalWords.filter(word => 
    resultWords.some(rWord => rWord.includes(word) || word.includes(rWord))
  ).length / originalWords.length;
  
  // Adjust score based on word preservation (max penalty of 0.3)
  score -= (1 - wordPreservation) * 0.3;
  
  // Check for unrealistic proportions (e.g., very short last name with long first name)
  if (result.firstName.length > 3 * result.lastName.length && result.lastName.length < 3) {
    score -= 0.2; // Penalty for potentially incorrect parsing
  }
  
  // Bonus for successfully extracting academic title
  if (result.academicTitle) {
    score = Math.min(1.0, score + 0.1); // Small bonus for academic title detection
  }
  
  // Apply reasonable bounds
  return Math.max(0.1, Math.min(1.0, score));
}

/**
 * Extract first name from a full name
 */
export function extractFirstName(fullName: string): string {
  return parseNameField(fullName).firstName;
}

/**
 * Extract last name from a full name
 */
export function extractLastName(fullName: string): string {
  return parseNameField(fullName).lastName;
}

/**
 * Extract academic title from a full name
 */
export function extractAcademicTitle(fullName: string): string | undefined {
  return parseNameField(fullName).academicTitle;
}

/**
 * Parse a name string and return structured name information
 * 
 * @param nameStr The name string to parse
 * @returns ParsedName object with structured name information
 */
export function parseName(nameStr: string): ParsedName {
  // Initialize results
  const result: ParsedName = {
    title: '',
    firstName: '',
    lastName: '',
    middleName: '',
    fullName: nameStr?.trim() || '',
    academicTitle: '',
    confidence: 0,
    issues: []
  };
  
  if (!nameStr || nameStr.trim() === '') {
    result.issues.push('Empty input');
    return result;
  }
  
  // Check if name has commas - if so, handle it specially
  if (nameStr.includes(',')) {
    const parts = nameStr.split(',').map(p => p.trim());
    
    // Simple case: LastName, FirstName or FullName, Title
    if (parts.length === 2) {
      // Check if the second part is a known academic title
      const secondPart = parts[1].trim();
      
      // Check if the second part is a common first name rather than a title
      const commonFirstNames = ['Maria', 'Anna', 'Thomas', 'Hans', 'Peter', 'Klaus', 'Eva', 'Karl', 'Max', 'Johannes', 'Michael', 'Andreas', 'Stefan', 'Julia', 'Sarah', 'Laura'];
      if (commonFirstNames.includes(secondPart)) {
        // This is "LastName, FirstName" format with a common first name
        result.lastName = parts[0];
        result.firstName = secondPart;
        result.confidence = 0.9;
        result.issues.push('Name contained comma, assumed format: "LastName, FirstName"');
        return result;
      }
      
      let isSecondPartTitle = ALL_ACADEMIC_TITLES.includes(secondPart);
      
      // If not an exact match, try normalized matching
      if (!isSecondPartTitle) {
        isSecondPartTitle = ALL_ACADEMIC_TITLES.some(title => {
          const normalizedTitle = title.replace(/\./g, '').toLowerCase();
          const normalizedPart = secondPart.replace(/\./g, '').toLowerCase();
          return normalizedTitle === normalizedPart;
        });
      }
      
      // Also check for common title prefixes (Prof, Dr, etc.)
      if (!isSecondPartTitle) {
        const titlePrefixes = ['Prof', 'Dr', 'Mag', 'Dipl', 'BA', 'MA', 'MBA', 'PhD'];
        isSecondPartTitle = titlePrefixes.some(prefix => 
          secondPart.startsWith(prefix) || secondPart.toLowerCase().startsWith(prefix.toLowerCase())
        );
      }
      
      if (isSecondPartTitle) {
        // This is "FullName, Title" format
        // Try to split the first part into first and last name
        const nameParts = parts[0].trim().split(/\s+/);
        if (nameParts.length >= 2) {
          result.firstName = nameParts.slice(0, -1).join(' ');
          result.lastName = nameParts[nameParts.length - 1];
        } else {
          // Single word name, assume it's lastName
          result.lastName = parts[0];
        }
        result.academicTitle = secondPart;
        result.confidence = 0.9;
        result.issues.push('Name contained comma, interpreted as "FullName, AcademicTitle" format');
      } else {
        // This is "LastName, FirstName" format
        result.lastName = parts[0];
        
        // Extract academic titles from the part after the comma
        const afterCommaResult = extractAcademicTitles(parts[1]);
        
        if (afterCommaResult.academicTitles.length > 0) {
          result.academicTitle = afterCommaResult.academicTitles.join(' ');
          result.firstName = afterCommaResult.nameWithoutTitles;
        } else {
          result.firstName = parts[1];
        }
        
        result.confidence = 0.9;
        result.issues.push('Name contained comma, assumed format: "LastName, FirstName"');
      }
      
      return result;
    } 
    // Complex case: LastName, Title1, Title2, FirstName
    else if (parts.length > 2) {
      result.lastName = parts[0];
      
      // Temporary storage for potential titles and name components
      const potentialTitles: string[] = [];
      const nameComponents: string[] = [];
      
      // Process all parts after the first comma
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        
        // First extract any academic titles that might be in this part
        const extractedTitlesResult = extractAcademicTitles(part);
        
        // If we found academic titles in this part, add them to our list
        if (extractedTitlesResult.academicTitles.length > 0) {
          potentialTitles.push(...extractedTitlesResult.academicTitles);
          
          // If there's still text left after extracting titles, it might be part of the name
          if (extractedTitlesResult.nameWithoutTitles) {
            nameComponents.push(extractedTitlesResult.nameWithoutTitles);
          }
          continue;
        }
        
        // Check if this part is a known academic title
        // First check if it exactly matches a known title
        let isTitleMatch = ALL_ACADEMIC_TITLES.includes(part);
        
        // If not an exact match, try normalized matching
        if (!isTitleMatch) {
          isTitleMatch = ALL_ACADEMIC_TITLES.some(title => {
            const normalizedTitle = title.replace(/\./g, '').toLowerCase();
            const normalizedPart = part.replace(/\./g, '').toLowerCase();
            return normalizedTitle === normalizedPart;
          });
        }
        
        // Also check for common title prefixes (Prof, Dr, etc.)
        if (!isTitleMatch) {
          const titlePrefixes = ['Prof', 'Dr', 'Mag', 'Dipl', 'BA', 'MA', 'MBA', 'PhD', 'Prim'];
          isTitleMatch = titlePrefixes.some(prefix => 
            part.startsWith(prefix) || part.toLowerCase().startsWith(prefix.toLowerCase())
          );
        }
        
        // Check if this is a common first name
        const commonFirstNames = ['Maria', 'Anna', 'Thomas', 'Hans', 'Peter', 'Klaus', 'Eva', 'Karl', 'Max', 'Johannes', 'Michael', 'Andreas', 'Stefan', 'Julia', 'Sarah', 'Laura', 'Herbert'];
        const isCommonFirstName = commonFirstNames.includes(part);
        
        // If it looks like a title and not a common first name, add to potential titles
        if (isTitleMatch && !isCommonFirstName) {
          potentialTitles.push(part);
        } 
        // Otherwise assume it's part of the name
        else {
          nameComponents.push(part);
        }
      }
      
      // Join the academic titles we found
      if (potentialTitles.length > 0) {
        result.academicTitle = potentialTitles.join(' ');
      }
      
      // If we have name components, use them for the first name
      if (nameComponents.length > 0) {
        result.firstName = nameComponents.join(' ');
      } 
      // If no name components but we have potential titles, use the last part as first name
      // This handles cases where we might have incorrectly classified a name as a title
      else if (parts.length > 0) {
        result.firstName = parts[parts.length - 1];
      }
      
      result.confidence = 0.9;
      result.issues.push('Name contained multiple commas, parsed as "LastName, Title(s), FirstName"');
      
      return result;
    }
  }
  
  // For non-comma cases, continue with the normal parsing logic
  
  // Extract academic titles before doing other parsing
  const { nameWithoutTitles: extractedNameWithoutTitles, academicTitles } = extractAcademicTitles(nameStr);
  
  // Join academic titles into a single string
  if (academicTitles.length > 0) {
    result.academicTitle = academicTitles.join(' ');
    
    // Add an issue note for debugging
    result.issues.push('Extracted academic title');
  }
  
  try {
    // Special case: Check if 'med.' was incorrectly extracted as part of the name
    let cleanedName = extractedNameWithoutTitles;
    const nameParts = cleanedName.split(' ');
    if (nameParts.length > 0 && nameParts[0].toLowerCase() === 'med.') {
      // If 'med.' is still in the name, move it to academic titles
      result.academicTitle = (result.academicTitle ? result.academicTitle + ' ' : '') + 'med.';
      cleanedName = nameParts.slice(1).join(' ');
    }
    
    // Parse using parse-full-name library
    const parsed = parseFullName(cleanedName);
    
    // Map to our return format from the library's format
    result.title = parsed.title || '';
    result.firstName = parsed.first || '';
    result.middleName = parsed.middle || '';
    result.lastName = parsed.last || '';
    
    // Handle special case where firstName is empty but middle is not
    if (!result.firstName && result.middleName) {
      result.firstName = result.middleName;
      result.middleName = '';
    }
    
    // Handle special case for compound first names (like Karl-Heinz)
    if (result.firstName && result.firstName.includes('-')) {
      // Already properly handled, just note it
      result.issues.push('Detected compound first name');
    }
    
    // Calculate confidence based on a simplified approach
    if (result.firstName && result.lastName) {
      result.confidence = 0.9;
    } else if (result.firstName || result.lastName) {
      result.confidence = 0.6;
      result.issues.push('Missing name component');
    } else {
      result.confidence = 0.1;
      result.issues.push('Failed to extract name components');
    }
    
    // If we still don't have proper name components, try a simpler approach
    if (!result.firstName || !result.lastName) {
      if (cleanedName) {
        const parts = cleanedName.split(/\s+/);
        if (parts.length === 1) {
          // Single word, assume it's a last name
          result.lastName = parts[0];
        } else if (parts.length > 1) {
          // Multiple words, assume first is firstName, last is lastName
          result.firstName = parts[0];
          result.lastName = parts[parts.length - 1];
          if (parts.length > 2) {
            // If there are more parts, use them as middle name
            result.middleName = parts.slice(1, -1).join(' ');
          }
        }
        result.issues.push('Used fallback name parsing');
      }
    }
    
    // Generate fullName from components if we have at least one name part
    if (result.firstName || result.lastName) {
      let fullName = '';
      
      if (result.academicTitle) {
        fullName += result.academicTitle + ' ';
      }
      
      if (result.title) {
        fullName += result.title + ' ';
      }
      
      if (result.firstName) {
        fullName += result.firstName + ' ';
      }
      
      if (result.middleName) {
        fullName += result.middleName + ' ';
      }
      
      if (result.lastName) {
        fullName += result.lastName;
      }
      
      result.fullName = fullName.trim();
    }
    
    // If we have an academic title, boost confidence
    if (result.academicTitle) {
      result.confidence = Math.min(1.0, result.confidence + 0.1);
    }
    
  } catch (error) {
    result.issues.push(`Error parsing name: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

/**
 * Extract academic title from a name
 * 
 * @param fullName The full name to extract the academic title from
 * @returns The academic title or empty string
 */
export function getAcademicTitle(fullName: string): string {
  if (!fullName) return '';
  
  const { academicTitles } = extractAcademicTitles(fullName);
  return academicTitles.length > 0 ? academicTitles.join(' ') : '';
} 