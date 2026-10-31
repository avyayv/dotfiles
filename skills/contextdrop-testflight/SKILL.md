---
name: contextdrop-testflight
description: Build, upload, and publish the Context Drop iOS app (FaceGuard, com.avyay.faceguard) to TestFlight, and assign the internal test group so testers can actually see the build. Use when Avyay asks to update TestFlight, publish/ship a new app build, bump the app build number, or asks why a build is not visible in TestFlight.
---

# Context Drop TestFlight publish

Publishes new Context Drop iOS builds to TestFlight from Avyay's Mac mini. The whole flow
is scriptable except one step: assigning the test group to the new build, which is done in
the App Store Connect web UI (Safari) with UI tools.

## Fixed facts

- Repo: `/Users/avyay/code/dari/context-drop` (mupt-ai/context-drop); app at `ios/` (SwiftUI, xcodegen `project.yml` + generated `project.pbxproj`).
- Work happens in a gwt worktree under `~/.avyay-worktrees/<branch>` (see global AGENTS.md). Never edit main directly.
- Bundle id `com.avyay.faceguard`, app name "Context Drop" (TestFlight shows the app as Context Drop).
- Team: Mupt, Inc., Team ID `6SMT972MY9` (paid, org, renewal Apr 19 2027).
- Signing: automatic, `CODE_SIGN_STYLE = Automatic`. Xcode already has an authenticated Apple ID session (used with `-allowProvisioningUpdates`). Export auto-creates/uses the "Apple Distribution: Mupt, Inc." cert + App Store profile. No ASC API key or app-specific password exists; do NOT plan around `xcrun altool`.
- Internal test group: "Avyay Internal" (2 testers: avyayv@gmail.com — the account on Avyay's phone that installs builds — and avyvar21@gmail.com, which has never accepted its invite and shows "No Builds Available").
- Phone: paired iPhone ("Avyay's iPhone"), previously FEB62DD5-0599-5A84-A139-5972EC10CAF3.
- `ITSAppUsesNonExemptEncryption` is already false in Info.plist, so export compliance does not gate the build.

## Publish flow

Run all of this from the worktree (`~/.avyay-worktrees/<branch>`), `ios/` for xcodebuild paths.

### 1. Validate before building

```bash
cd <worktree>/ios
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

# Full-source typecheck (fast gate, catches everything at once)
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun swiftc -typecheck -parse-as-library -sdk "$SDK" -target arm64-apple-ios17.0-simulator Sources/*.swift

# Navigation source-contract test (tab structure, shared navigation, no WebKit in DigestView, etc.)
out=$(mktemp -d)
xcrun swiftc Tests/Navigation/main.swift -o "$out/navtest" && "$out/navtest" Sources

# Snapshot tests (mocked transport; covers HealthStore persistence/refresh)
bash Tests/Snapshot/run.sh
```

Other suites (Style, HealthStore, Workout, RecordingStore, Sleep, Goals, Food, Detection)
are compiled per the compile lists in `ios/README.md`. Style needs a booted
simulator (`xcrun simctl boot <udid>` then `xcrun simctl spawn <udid> <binary>`).
`Tests/HealthStore/main.swift` requires a private HealthSnapshot fixture path argument —
it "crashes" with Index out of range when run without args; that is expected, not a regression.

### 2. Bump the build number

`CURRENT_PROJECT_VERSION` lives in BOTH files and must be bumped in both:

```bash
cd <worktree>
rg -n 'CURRENT_PROJECT_VERSION' ios/project.yml ios/ContextDrop.xcodeproj/project.pbxproj
sed -i '' 's/CURRENT_PROJECT_VERSION = <N>;/CURRENT_PROJECT_VERSION = <N+1>;/' ios/ContextDrop.xcodeproj/project.pbxproj
sed -i '' 's/CURRENT_PROJECT_VERSION: <N>$/CURRENT_PROJECT_VERSION: <N+1>/' ios/project.yml
```

Check the current highest build in App Store Connect (see step 5) if unsure. Build numbers
must strictly increase per version; a duplicate is rejected at upload.

### 3. Commit

Commit all app changes (source, tests, project.yml, pbxproj, Info.plist, Assets) in the
worktree before archiving. Note the commit hash for the report.

### 4. Archive, export, upload (fully scriptable)

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd <worktree>/ios
mkdir -p /tmp/contextdrop-tf

# Archive (signs with dev profile at this stage; fine)
xcodebuild archive -project ContextDrop.xcodeproj -scheme ContextDrop \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath /tmp/contextdrop-tf/ContextDrop<N>.xcarchive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=6SMT972MY9

# Upload to App Store Connect (app-store-connect method + destination upload).
# This re-signs with the Apple Distribution cert and uploads using Xcode's Apple ID session.
cat > /tmp/contextdrop-tf/UploadOptions.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>teamID</key>
	<string>6SMT972MY9</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>uploadSymbols</key>
	<true/>
	<key>destination</key>
	<string>upload</string>
</dict>
</plist>
EOF

xcodebuild -exportArchive -archivePath /tmp/contextdrop-tf/ContextDrop<N>.xcarchive \
  -exportPath /tmp/contextdrop-tf/upload \
  -exportOptionsPlist /tmp/contextdrop-tf/UploadOptions.plist \
  -allowProvisioningUpdates
```

Success looks like: `Progress 100%: Upload succeeded.` then `** EXPORT SUCCEEDED **`.
Processing is usually near-instant for this small app ("Complete" within a minute).
Detailed logs land in `/var/folders/.../ContextDrop_<timestamp>.xcdistributionlogs/`
(`ContentDelivery.log` has `UPLOAD SUCCEEDED with no errors`).

### 5. CRITICAL: assign the test group (this is why builds "don't show up")

A freshly uploaded build has **Groups (0) / Individual Testers (0)** — no tester can see
it, and TestFlight on the phone keeps showing the old build. The Avyay Internal group is
NOT auto-attached. You must add it in the App Store Connect web UI via Safari (the saved
login session), using UI tools (find_roots/observe_ui/search_ui/act_ui):

1. `find_roots` → Safari — App Store Connect (window titled "App Store Connect"). If
   Safari isn't on ASC, open it and navigate to
   `appstoreconnect.apple.com/apps/<app-id>/testflight/ios` (use the existing session;
   do not ask for credentials).
2. Navigate: TestFlight section → "Builds" → "iOS" (link) → this opens "iOS Builds" with
   the "Build Uploads" table and a "Version 0.6.0" button below it.
3. Verify the new build row in "Build Uploads" shows status "Complete".
4. Click the build link "Version 0.6.0 , Build (<N>)" to open the build detail page.
   It will show "Groups (0)" and an "Add Group" button.
5. Press "Add Group". In the dialog, check the "Avyay" row's checkbox ("Select Avyay").
   The dialog's confirm button changes from "Next" to "Add" when a group is selected —
   use that as the check state signal. Press "Add" and wait for "Adding…" to finish.
6. The build page now shows "Group (1)" with row "Avyay Internal 2".
7. Back on "iOS Builds" → "Version 0.6.0" region, the Builds table should list both the
   new and old builds as available to test.

UI-tool gotchas on the ASC page: refs go stale after navigation — re-observe after every
click; use `search_ui` for text (checkboxes are found by role `checkbox`, named
"Select Avyay"); `read_text` often returns empty on ASC nodes, rely on search/expand.

### 6. Verify and tell Avyay

- The phone account is avyayv@gmail.com — it sees builds once the group is attached.
  Tell Avyay to pull-to-refresh TestFlight (or force-close/reopen) to see the new build.
- avyvar21@gmail.com has never accepted its invite ("No Builds Available" for it) — that
  is expected unless Avyay accepts the invite from that account; don't chase it.

## Install-on-phone alternative (development signing)

For a direct device install without TestFlight (dev-signed, 365-day Mupt profile):

```bash
xcodebuild -project ContextDrop.xcodeproj -scheme ContextDrop \
  -configuration Debug -destination 'id=<iphone-udid>' \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=6SMT972MY9
```

Dev builds also install via the `ios/build-device/` products. Note dev-signed
installs can replace a TestFlight install (same bundle id) but not vice versa without
uninstalling.

## Common failures

- **Upload rejected: build number already exists** → bump `CURRENT_PROJECT_VERSION` (both
  files) and re-archive.
- **Build "Complete" but phone still shows old build** → the group was never attached; do
  step 5. This is the failure mode that looks like "processing is stuck".
- **`xcrun: error: SDK "iphonesimulator" cannot be located`** → `export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` (system xcode-select points at CLT only).
- **ATS**: the native Digest tab fetches `http://avyays-mac-mini.tailf3cee5.ts.net:17371`
  over plain http; the Info.plist/project.yml carry `NSExceptionDomains` for that host.
  Keep that exception if networking changes, and remember the Digest tab needs Tailscale
  up on the phone.
- **Stale CLAUDE.md**: the repo's CLAUDE.md still describes the old open_oura layout
  (`apps/ios/TESTFLIGHT.md` etc.). The real app is `ios/`; this skill is the
  source of truth for publishing.
