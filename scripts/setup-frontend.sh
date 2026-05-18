#!/usr/bin/env bash
# DestinationPacker - Frontend Setup Script (macOS)
# Run this once on your Mac to set up the React Native / Expo dev environment.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

# macOS only
if [[ "$(uname)" != "Darwin" ]]; then
  die "This script is for macOS only."
fi

echo ""
echo "=============================================="
echo "   DestinationPacker -- Frontend Setup (Mac)"
echo "=============================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$APP_DIR/mobile"

# -- 1. Xcode Command Line Tools -----------------------------------------------
if xcode-select -p &>/dev/null; then
  success "Xcode Command Line Tools already installed"
else
  info "Installing Xcode Command Line Tools (follow the prompt)..."
  xcode-select --install
  echo "  After the installer finishes, re-run this script."
  exit 0
fi

# -- 2. Homebrew ---------------------------------------------------------------
if command -v brew &>/dev/null; then
  success "Homebrew already installed ($(brew --version | head -1))"
else
  info "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  fi
fi

# -- 3. Node.js via nvm --------------------------------------------------------
NODE_TARGET="20"

if command -v nvm &>/dev/null || [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  success "nvm already installed"
else
  info "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Load nvm for this session
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
[[ -s "$NVM_DIR/bash_completion" ]] && source "$NVM_DIR/bash_completion"

if ! command -v nvm &>/dev/null; then
  die "nvm not found after install. Close this terminal, open a new one, and re-run."
fi

CURRENT_NODE=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [[ "$CURRENT_NODE" -ge "$NODE_TARGET" ]]; then
  success "Node.js $(node --version) already installed"
else
  info "Installing Node.js $NODE_TARGET via nvm..."
  nvm install "$NODE_TARGET"
  nvm use "$NODE_TARGET"
  nvm alias default "$NODE_TARGET"
fi
success "Using Node.js $(node --version)"

# -- 4. Watchman (required for Metro bundler) ----------------------------------
if command -v watchman &>/dev/null; then
  success "Watchman already installed"
else
  info "Installing Watchman..."
  brew install watchman
fi

# -- 5. Expo CLI ---------------------------------------------------------------
if command -v expo &>/dev/null; then
  success "Expo CLI already installed"
else
  info "Installing Expo CLI..."
  npm install -g expo-cli @expo/cli
fi

# -- 6. EAS CLI (for building release APK/IPA later) --------------------------
if command -v eas &>/dev/null; then
  success "EAS CLI already installed"
else
  info "Installing EAS CLI..."
  npm install -g eas-cli
fi

# -- 7. npm install ------------------------------------------------------------
if [[ ! -d "$MOBILE_DIR" ]]; then
  die "Mobile directory not found at $MOBILE_DIR. Make sure you cloned the full repo."
fi

info "Installing npm dependencies..."
cd "$MOBILE_DIR"
npm install
success "npm dependencies installed"

# -- 8. Supabase environment ---------------------------------------------------
ENV_FILE="$MOBILE_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  success "mobile/.env already exists"
else
  cp "$MOBILE_DIR/.env.example" "$ENV_FILE"
  warn "Created mobile/.env from .env.example. Fill in your Supabase URL and anon key before running the app."
fi

# -- Done ----------------------------------------------------------------------
echo ""
echo "=============================================="
echo "   Setup complete!"
echo "=============================================="
echo ""
echo "  Start the dev server:"
echo "    cd mobile && npx expo start"
echo ""
echo "  Scan the QR code with Expo Go on your phone, or:"
echo "    Press 'i' for iOS Simulator (requires Xcode)"
echo "    Press 'a' for Android emulator (requires Android Studio)"
echo ""
echo "  Configure Supabase in:"
echo "    mobile/.env"
echo ""
echo "  Before building for release:"
echo "    eas build --platform ios"
echo "    eas build --platform android"
echo ""
