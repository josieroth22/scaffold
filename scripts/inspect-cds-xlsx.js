const XLSX = require("xlsx");
const wb = XLSX.readFile("/Users/user/scaffold-project/CDS Data/2024-25 Macalester College.xlsx");

// Dump key sections
for (const sheetName of ["CDS-C", "CDS-G", "CDS-H"]) {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log("\n=== " + sheetName + " ===");
  data.forEach((r, i) => {
    const nonEmpty = r.filter(x => x !== "");
    if (nonEmpty.length > 0) {
      const text = nonEmpty.join(" | ");
      if (text.length > 5) {
        console.log("Row " + i + ": " + text.substring(0, 200));
      }
    }
  });
}
