/**
 * NativeWind PostCSS Patch
 *
 * NativeWind v2 calls PostCSS synchronously, but PostCSS 8.4.31+ may use
 * async plugins internally. This patch wraps the extractStyles function so
 * that it uses `deasync` to block the event-loop when the synchronous path
 * fails with an "async" error.
 *
 * Run automatically via `npm run postinstall` or `node scripts/patch-nativewind.js`.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'nativewind',
  'dist',
  'postcss',
  'extract-styles.js'
);

// Only patch if the file exists and hasn't been patched yet
if (!fs.existsSync(FILE)) {
  console.log('[patch-nativewind] nativewind not installed — skipping.');
  process.exit(0);
}

const src = fs.readFileSync(FILE, 'utf-8');

if (src.includes('deasync')) {
  console.log('[patch-nativewind] Already patched — skipping.');
  process.exit(0);
}

// The patched version of extractStyles
const PATCHED = `"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractStyles = void 0;
const postcss_1 = __importDefault(require("postcss"));
const tailwindcss_1 = __importDefault(require("tailwindcss"));
const postcss_2 = __importDefault(require("../postcss"));
const serialize_1 = require("./serialize");
function extractStyles(tailwindConfig, cssInput = "@tailwind components;@tailwind utilities;") {
    let errors = [];
    let output = {
        styles: {},
        topics: {},
        masks: {},
        atRules: {},
        units: {},
        transforms: {},
        childClasses: {},
    };
    const plugins = [
        (0, tailwindcss_1.default)(tailwindConfig),
        (0, postcss_2.default)({
            ...tailwindConfig,
            done: ({ errors: resultErrors, ...result }) => {
                output = result;
                errors = resultErrors;
            },
        }),
    ];
    // Patched: handle async PostCSS plugins using deasync
    try {
        const processor = (0, postcss_1.default)(plugins);
        const lazyResult = processor.process(cssInput);
        try {
            // Try synchronous first
            lazyResult.css;
        } catch (syncError) {
            if (syncError.message && syncError.message.includes('async')) {
                // Use deasync to run the async PostCSS pipeline synchronously
                let done = false;
                let asyncError = null;
                lazyResult.then(
                    (result) => {
                        // The 'done' callback in the plugin already captured output
                        done = true;
                    },
                    (err) => {
                        asyncError = err;
                        done = true;
                    }
                );
                // Block the event loop until the promise resolves
                const deasync = require('deasync');
                deasync.loopWhile(() => !done);
                if (asyncError) {
                    console.warn('[NativeWind Patch] Async PostCSS error:', asyncError.message ? asyncError.message.substring(0, 200) : 'unknown');
                }
            } else {
                throw syncError;
            }
        }
    } catch (outerError) {
        console.warn('[NativeWind Patch] extractStyles failed:', outerError.message ? outerError.message.substring(0, 200) : 'unknown');
    }
    return {
        ...(0, serialize_1.serializer)(output),
        errors,
    };
}
exports.extractStyles = extractStyles;
`;

fs.writeFileSync(FILE, PATCHED, 'utf-8');
console.log('[patch-nativewind] ✅ Patched extract-styles.js (deasync async PostCSS fix)');
