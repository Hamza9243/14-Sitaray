const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname);

// Metro has no reason to watch native build output — `android/` and `ios/`
// contain Gradle/CocoaPods caches whose contents can appear and disappear
// mid-build, which crashes Metro's Windows file watcher (ENOENT on
// android/.gradle/build-attribution, Pods/, etc).
//
// Patterns must be written with `/` only (no `\` or character classes) —
// exclusionList's escapeRegExp rewrites every `/` to the OS path separator
// itself, which mangles `[\\/]`-style classes into unterminated ones.
const projectRootPattern = __dirname
  .split(require('path').sep)
  .join('/')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = exclusionList([
  new RegExp(`^${projectRootPattern}/android/.*$`),
  new RegExp(`^${projectRootPattern}/ios/.*$`),
]);

module.exports = config;
