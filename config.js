// Central place to configure runtime values like API base URL.
// Priority: Expo manifest extra -> process.env.API_BASE -> fallback NGROK URL
import Constants from "expo-constants";

const manifest = Constants.manifest || Constants.expoConfig || {};
const extra = manifest.extra || {};

const API_BASE =
  extra.API_BASE ||
  process.env?.API_BASE ||
  "https://unilaterally-waterlocked-chelsea.ngrok-free.dev";

export default {
  API_BASE,
};
