const fs = require("fs");
const path = require("path");

function parseDotEnv(filePath) {
  try {
    const txt = fs.readFileSync(filePath, "utf8");
    const lines = txt.split(/\r?\n/);
    const out = {};
    for (let l of lines) {
      l = l.trim();
      if (!l || l.startsWith("#")) continue;
      const idx = l.indexOf("=");
      if (idx === -1) continue;
      const k = l.slice(0, idx).trim();
      let v = l.slice(idx + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      out[k] = v;
    }
    return out;
  } catch (e) {
    return {};
  }
}

const projectRoot = __dirname;
const appJsonPath = path.join(projectRoot, "app.json");
let appJson = {};
try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
} catch (e) {
  appJson = {};
}

// priority: process.env -> .env file -> fallback ngrok
let apiBase = process.env.API_BASE;
if (!apiBase) {
  const envPath = path.join(projectRoot, ".env");
  const parsed = parseDotEnv(envPath);
  apiBase = parsed.API_BASE;
}
if (!apiBase)
  apiBase = "https://unilaterally-waterlocked-chelsea.ngrok-free.dev";

// export Expo config with extra.API_BASE and ensure name stays consistent with app.json
const expoConfig = Object.assign({}, appJson.expo || {});
if (appJson && appJson.expo && appJson.expo.name) {
  expoConfig.name = appJson.expo.name;
}
// Note: For native production builds, Expo requires local icon/splash assets.
// We set remote URLs above for quick development and web preview, but
// consider placing the provided logo into ./assets/ and updating app.json
// to use local files before submitting to app stores.
expoConfig.android = Object.assign({}, expoConfig.android || {}, {
  package: "com.tungdev1109.healthycheck",
});
expoConfig.extra = Object.assign({}, expoConfig.extra || {}, {
  API_BASE: apiBase,
  eas: {
    projectId: "f3b6ee78-6a7e-4864-9e35-42e14e4d7971", // 👈 ID EAS bạn được cấp
  },
});

module.exports = {
  expo: expoConfig,
};
