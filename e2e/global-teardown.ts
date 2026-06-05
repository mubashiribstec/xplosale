import * as fs from "fs";
import * as path from "path";

async function teardown() {
  const stateDir = path.join(__dirname, ".auth");
  if (fs.existsSync(stateDir)) {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
  console.log("[teardown] Cleaned up test auth state.");
}

export default teardown;
