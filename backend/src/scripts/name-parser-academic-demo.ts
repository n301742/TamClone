/**
 * name-parser-academic-demo.ts
 * 
 * Demo script to showcase the improved name parser with academic title handling
 * Especially for German-speaking countries (Austria, Germany)
 */

import { parseName } from '../utils/name-parser';
import readline from 'readline';

// Create examples of German/Austrian names with academic titles
const examples = [
  // Basic examples
  'Dr. Thomas Weber',
  'Prof. Dr. Anna Schmidt',
  'Dipl.-Ing. Michael Huber',
  'Mag. Sabine Bauer',
  
  // Complex examples with multiple titles
  'Univ.-Prof. Dr. med. Franz Müller',
  'Prim. Univ.-Prof. DDr. Herbert Mayer',
  'Dr. rer. nat. Karin Wagner',
  'Dipl.-Ing. Dr. techn. Josef Berger',
  
  // Examples with comma-separated titles
  'Hans Mayer, MBA',
  'Elisabeth Gruber, Mag. rer. nat.',
  
  // Examples with noble titles
  'Dr. Friedrich von Hohenberg',
  'Prof. Dr. Maria von der Tann'
];

// Function to run the demo
function runDemo() {
  console.log('================================================');
  console.log('Name Parser Demo - Academic Titles');
  console.log('================================================');
  console.log('This demo showcases the parsing of names with academic titles');
  console.log('Especially formatted for German-speaking countries\n');
  
  // Process each example
  examples.forEach((name, index) => {
    console.log(`Example ${index + 1}: "${name}"`);
    const parsed = parseName(name);
    
    console.log('  Parsed result:');
    console.log(`  - Academic Title: ${parsed.academicTitle || '(none)'}`);
    console.log(`  - Title: ${parsed.title || '(none)'}`);
    console.log(`  - First Name: ${parsed.firstName || '(none)'}`);
    console.log(`  - Middle Name: ${parsed.middleName || '(none)'}`);
    console.log(`  - Last Name: ${parsed.lastName || '(none)'}`);
    console.log(`  - Confidence: ${parsed.confidence.toFixed(2)}`);
    
    if (parsed.issues.length > 0) {
      console.log('  - Issues:');
      parsed.issues.forEach(issue => {
        console.log(`    * ${issue}`);
      });
    }
    
    console.log('------------------------------------------------\n');
  });
  
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('Enter a name to parse (or type "exit" to quit):');
  
  rl.on('line', (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }
    
    const parsed = parseName(input.trim());
    
    console.log('\nParsed result:');
    console.log(`- Academic Title: ${parsed.academicTitle || '(none)'}`);
    console.log(`- Title: ${parsed.title || '(none)'}`);
    console.log(`- First Name: ${parsed.firstName || '(none)'}`);
    console.log(`- Middle Name: ${parsed.middleName || '(none)'}`);
    console.log(`- Last Name: ${parsed.lastName || '(none)'}`);
    console.log(`- Confidence: ${parsed.confidence.toFixed(2)}`);
    
    if (parsed.issues.length > 0) {
      console.log('- Issues:');
      parsed.issues.forEach(issue => {
        console.log(`  * ${issue}`);
      });
    }
    
    console.log('\nEnter another name to parse (or type "exit" to quit):');
  });
  
  rl.on('close', () => {
    console.log('Thank you for using the Name Parser Demo!');
    process.exit(0);
  });
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo();
}

// Export the function for potential use elsewhere
export { runDemo }; 