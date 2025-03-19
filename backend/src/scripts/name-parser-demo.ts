/**
 * Name Parser Demo Script
 * 
 * This script demonstrates how to use the name parser utility to extract first and 
 * last names from a full name string. It can be used both as an importable function
 * and directly from the command line.
 */

import { parseName, parseNameField } from '../utils/name-parser';

/**
 * Parses a full name into first name and last name components
 * @param fullName The full name to parse
 * @returns An object with firstName, lastName, and academicTitle
 */
export function parseNameWrapper(fullName: string): { firstName: string; lastName: string; academicTitle: string } {
  const result = parseNameField(fullName);
  
  return {
    firstName: result.firstName,
    lastName: result.lastName,
    academicTitle: result.academicTitle || ''
  };
}

/**
 * Simple CLI for parsing names from command line
 */
function runCli(): void {
  if (process.argv.length < 3) {
    console.log('Please provide a name to parse as an argument');
    console.log('Usage: ts-node name-parser-demo.ts "John Doe"');
    process.exit(1);
  }
  
  const nameInput = process.argv[2];
  const result = parseName(nameInput);
  
  // Debug output
  console.log('Raw parser result:', JSON.stringify(result, null, 2));
  
  console.log(`Input: "${nameInput}"`);
  console.log(`First Name: "${result.firstName}"`);
  console.log(`Last Name: "${result.lastName}"`);
  console.log(`Academic Title: "${result.academicTitle || ''}"`);
  console.log(`Confidence: ${result.confidence.toFixed(2)}`);
  
  if (result.issues && result.issues.length > 0) {
    console.log(`Note: ${result.issues[0]}`);
  }
  
  // If there are more issues, display them as well
  if (result.issues && result.issues.length > 1) {
    for (let i = 1; i < result.issues.length; i++) {
      console.log(`      ${result.issues[i]}`);
    }
  }
}

// Run CLI if executed directly
if (require.main === module) {
  runCli();
} 