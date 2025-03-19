/**
 * Simple script to test the name parser utility directly
 */

import { parseNameField } from './name-parser';

// Test cases
const testCases = [
  // Basic cases
  'John Doe',
  'Smith',
  'Jean-Pierre Dubois',
  'Ludwig von Beethoven',
  'Müller, Hans',
  'Maria Garcia Rodriguez',
  
  // German/Austrian academic titles
  'Dr. Thomas Weber',
  'Prof. Dr. Anna Schmidt',
  'Dr. med. univ. Michael Huber',
  'Dipl.-Ing. Stefan Müller',
  'Mag. Christina Bauer',
  'PhD Sarah Connor',
  'MSc Martin Gruber',
  'Univ.Prof. Dr.phil. Robert Schneider',
  'Hans Mayer, MBA',
  'Dr. Karl-Heinz von der Hofen',
  'DI Maria Berger',
  'Mag.rer.nat. Josef Baumgartner',
  'Dr.iur. Elisabeth Hofmann',
  'MMag. Dr. Franz Huber',
  ''
];

// Run tests
console.log('Name Parser Test Results:');
console.log('========================');

testCases.forEach(name => {
  const result = parseNameField(name);
  console.log(`Input: "${name}"`);
  console.log(`  First Name: "${result.firstName}"`);
  console.log(`  Last Name: "${result.lastName}"`);
  if (result.academicTitle) {
    console.log(`  Academic Title: "${result.academicTitle}"`);
  }
  console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
  if (result.possibleIssue) {
    console.log(`  Issue: ${result.possibleIssue}`);
  }
  console.log('------------------------');
});

console.log('Test completed.'); 