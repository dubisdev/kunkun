import { expect, test } from "bun:test";
import fs from "fs";
import { JarvisExtJson } from "../manifest";

test("Load extension manifest in this repo", () => {
  for (const extJsonPath of [
    "../extensions/qrcode/jarvis.ext.json",
    "../extensions/myip/jarvis.ext.json",
    "../extensions/vscode-project-manager/jarvis.ext.json",
  ]) {
    const manifestStr = fs.readFileSync(extJsonPath).toString();
    JarvisExtJson.parse(JSON.parse(manifestStr));
  }
});