import {
  copyFile,
  mkdir,
} from "node:fs/promises";

import {
  join,
} from "node:path";

const projectRoot =
  process.cwd();

const sourceDirectory =
  join(
    projectRoot,
    "node_modules",
    "maplibre-gl",
    "dist"
  );

const destinationDirectory =
  join(
    projectRoot,
    "public",
    "maplibre"
  );

// Create public worker directory
await mkdir(
  destinationDirectory,
  {
    recursive: true,
  }
);

// Worker entry file
await copyFile(
  join(
    sourceDirectory,
    "maplibre-gl-worker.mjs"
  ),
  join(
    destinationDirectory,
    "maplibre-gl-worker.mjs"
  )
);

// Shared worker dependency
await copyFile(
  join(
    sourceDirectory,
    "maplibre-gl-shared.mjs"
  ),
  join(
    destinationDirectory,
    "maplibre-gl-shared.mjs"
  )
);

console.log(
  "Copied MapLibre worker files."
);