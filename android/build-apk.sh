#!/usr/bin/env bash
# Builds the signed StudyLoop APK and drops it at public/studyloop.apk for the site's download link.
# Needs: JDK 17 or 21 (JAVA_HOME), the Android SDK (ANDROID_HOME, default ~/Android/Sdk),
# Gradle 8.11.x (on PATH or the cached wrapper dist), and ~/.android/studyloop/signing.properties.
set -euo pipefail
cd "$(dirname "$0")"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
echo "sdk.dir=$ANDROID_HOME" > local.properties

GRADLE="$(command -v gradle || ls -d "$HOME"/.gradle/wrapper/dists/gradle-8.11.1-bin/*/gradle-8.11.1/bin/gradle 2>/dev/null | head -1)"
[ -x "$GRADLE" ] || { echo "Gradle 8.11 not found" >&2; exit 1; }

"$GRADLE" --no-daemon assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../public/studyloop.apk
echo "Built public/studyloop.apk"
