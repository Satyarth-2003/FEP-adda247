const fs = require("fs");
const path = require("path");

const DIRECTORY = path.join(__dirname, "../scripts");

const REPLACEMENTS = [
  // Exact cohort replacements
  { search: /June EduSkill/g, replace: "June EduSkill" },
  { search: /March EduSkill/g, replace: "March EduSkill" },
  { search: /June\+EduSkill/g, replace: "June+EduSkill" },
  { search: /March\+EduSkill/g, replace: "March+EduSkill" },
  
  // Role strings
  { search: /eduskill_faculty/g, replace: "eduskill_faculty" },
  { search: /eduskill_manager/g, replace: "eduskill_manager" },
  { search: /eduskill_admin/g, replace: "eduskill_admin" },
  
  // Program descriptions
  { search: /EduSkill Program/g, replace: "EduSkill Program" },
  { search: /EduSkill · EduSkill Program/g, replace: "EduSkill · EduSkill Program" },
  { search: /EduSkill/g, replace: "EduSkill" },
  
  // Theme cookie name
  { search: /eduskill_theme/g, replace: "eduskill_theme" }
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (stat.isFile() && /\.(tsx|ts|js|json|css|md|mjs)$/.test(file)) {
      let content = fs.readFileSync(fullPath, "utf8");
      let original = content;
      
      // Apply replacements
      for (const r of REPLACEMENTS) {
        content = content.replace(r.search, r.replace);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`Replaced strings in: ${path.relative(DIRECTORY, fullPath)}`);
      }
    }
  }
}

console.log("Starting code replacements: EduSkill to EduSkill...");
walk(DIRECTORY);
console.log("✓ Code replacements completed successfully!");
