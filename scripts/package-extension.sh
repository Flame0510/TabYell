#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
manifest_path="$repo_root/manifest.json"
dist_dir="$repo_root/dist"

for command_name in node zip unzip; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

version="$(
  node -e '
    const fs = require("node:fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(String(manifest.version || ""));
  ' "$manifest_path"
)"

if [[ ! "$version" =~ ^[0-9]+(\.[0-9]+){0,3}$ ]]; then
  echo "Invalid extension version in manifest.json: $version" >&2
  exit 1
fi

runtime_files=(
  "manifest.json"
  "background.js"
  "popup.html"
  "popup.css"
  "popup.js"
)
runtime_directories=(
  "icons"
  "_locales"
)

for relative_path in "${runtime_files[@]}"; do
  if [[ ! -f "$repo_root/$relative_path" ]]; then
    echo "Missing required extension file: $relative_path" >&2
    exit 1
  fi
done

for relative_path in "${runtime_directories[@]}"; do
  if [[ ! -d "$repo_root/$relative_path" ]]; then
    echo "Missing required extension directory: $relative_path" >&2
    exit 1
  fi
done

unpacked_dir="$dist_dir/tabyell-${version}-unpacked"
zip_path="$dist_dir/tabyell-${version}.zip"
checksum_path="${zip_path}.sha256"

mkdir -p "$dist_dir"
case "$unpacked_dir" in
  "$dist_dir/"*) ;;
  *)
    echo "Refusing to clean unexpected output path: $unpacked_dir" >&2
    exit 1
    ;;
esac

rm -rf -- "$unpacked_dir"
rm -f -- "$zip_path" "$checksum_path"
mkdir -p "$unpacked_dir"

for relative_path in "${runtime_files[@]}"; do
  cp "$repo_root/$relative_path" "$unpacked_dir/$relative_path"
done

for relative_path in "${runtime_directories[@]}"; do
  cp -R "$repo_root/$relative_path" "$unpacked_dir/$relative_path"
done

(
  cd "$unpacked_dir"
  COPYFILE_DISABLE=1 zip -X -q -r "$zip_path" .
)

manifest_entries="$(
  unzip -Z1 "$zip_path" |
    awk '$0 == "manifest.json" { count += 1 } END { print count + 0 }'
)"
if [[ "$manifest_entries" != "1" ]]; then
  echo "Package must contain exactly one manifest.json at its root" >&2
  exit 1
fi

if unzip -Z1 "$zip_path" | grep -Eq '(^|/)__MACOSX/|(^|/)\.DS_Store$'; then
  echo "Package contains unwanted macOS metadata" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$dist_dir"
    sha256sum "$(basename "$zip_path")" > "$(basename "$checksum_path")"
  )
else
  (
    cd "$dist_dir"
    shasum -a 256 "$(basename "$zip_path")" > "$(basename "$checksum_path")"
  )
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "version=$version"
    echo "zip_name=$(basename "$zip_path")"
    echo "zip_path=dist/$(basename "$zip_path")"
    echo "checksum_name=$(basename "$checksum_path")"
    echo "checksum_path=dist/$(basename "$checksum_path")"
  } >> "$GITHUB_OUTPUT"
fi

echo "Created Chrome Web Store package: $zip_path"
echo "Created unpacked test directory: $unpacked_dir"
echo "Created SHA-256 checksum: $checksum_path"
