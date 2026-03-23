# 📚 Vocabulary Quiz Platform - Multi-Language Learning System

> A comprehensive, interactive vocabulary learning application supporting **Japanese (JLPT N1-N5), English-Vietnamese, and Grammar**. Built with React 18 and Vite for high performance.

![Version](https://img.shields.io/badge/version-2.0.0-blue) ![React](https://img.shields.io/badge/React-19.2.0-61dafb) ![Vite](https://img.shields.io/badge/Vite-Latest-646cff) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Overview

Vocabulary Quiz Platform is a modern, gamified vocabulary learning system designed for learners of **Japanese (JLPT levels)** and **English-Vietnamese vocabulary**. The platform combines interactive quizzes, flashcards, dictionary searches, and grammar lessons with a polished user experience featuring seasonal themes, dark/light modes, and progress tracking.

**Key Datasets:**

- **English-Vietnamese**: 5,800+ words from multiple dictionary sources
- **Japanese JLPT**: 10,000+ vocabulary entries across N5-N1 proficiency levels
- **Kanji Database**: 2,000+ kanji with stroke orders and meanings
- **Grammar Lessons**: Comprehensive Japanese grammar instruction

---

## ✨ Core Features

### 📖 Learning Modes

- **Quiz Mode** (Random/Sequential)
  - Multiple choice questions
  - Instant feedback with explanations
  - Keyboard shortcuts (1-4 to select, Enter to check/next)
  - Haptic feedback on wrong answers (mobile)
- **Flashcard Mode**
  - Spaced repetition system
  - Flip animation with Space bar
  - Navigation with arrow keys
  - Ruby text support for Japanese readings
- **Dictionary Search**
  - Real-time vocabulary lookup
  - Multiple language support
  - Detailed word information
- **Grammar Lessons**
  - Structured grammar patterns
  - Usage examples
  - Progressive difficulty levels

### 🎮 Gamification & Engagement

- **Streaks & Progress Tracking**: Maintain daily streaks and track learning progress
- **Confetti Celebration**: Visual effects for high scores (>70%)
- **Achievement System**: Milestones and badges
- **Seasonal Themes**: Dynamic UI updates for holidays (Lunar New Year, Tet, etc.)
- **Leaderboard**: Competitive learning environment

### 🌐 Personalization

- **Dark/Light Mode**: Eye-friendly theme switching
- **User Profiles**: Track individual progress and preferences
- **Bookmarks**: Save words for later review
- **Custom Quiz Settings**: Choose difficulty, question count, and order
- **Mobile Optimized**: Responsive design with touch-friendly controls

### ☁️ Data Management

- **Google Sheets Sync**: Easy content management during development
- **LocalStorage Caching**: Instant app loading with offline support
- **Automatic Data Sync**: Background sync for vocabulary updates
- **CSV Import/Export**: Backup and migration support

---

## 📊 Data Structure

### Vocabulary Schema

```json
{
  "id": 1,
  "english": "abide by",
  "vietnamese": "tuân thủ",
  "hiragana": "したがう",
  "hanViet": "漢越讀み",
  "hint": "(V) - Động từ",
  "explanation": "Two parties agreed to _____ the judge's decision.",
  "kanji": "従う"
}
```

### Dataset Sizes

| Dataset            | Entries | Size     | Language Pair | Location                                |
| ------------------ | ------- | -------- | ------------- | --------------------------------------- |
| English-Vietnamese | 5,800+  | 5.8 MB   | EN → VI       | `open-vn-en-dict-master/words.json`     |
| JLPT N1            | 2,000+  | 284 KB   | JA → VI       | `data/voca_n1.json`                     |
| JLPT N2            | 3,000+  | 456 KB   | JA → VI       | `data/voca_n2.json`                     |
| JLPT N3            | 2,500+  | 239 KB   | JA → VI       | `data/voca_n3.json`                     |
| JLPT N4            | 1,800+  | 247 KB   | JA → VI       | `data/voca_n4.json`                     |
| JLPT N5            | 1,500+  | 184 KB   | JA → VI       | `data/voca_n5.json`                     |
| Kanji Bank 1       | 1,000+  | 2,074 KB | JA → VI       | `data/kanji_bank_1.json`                |
| Kanji Bank 2       | 500+    | 69 KB    | JA → VI       | `data/kanji_bank_2.json`                |
| Grammar            | 100+    | 2.35 KB  | JA → VI       | `data/sheets/sheet_grammar.json`        |
| Raw Dict Sources   | 35+ MB  | Combined | Various       | `open-vn-en-dict-master/` (tracau, etc) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 16.x or higher
- **npm**: 8.x or higher (or yarn/pnpm)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd vocab-quiz-react
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

4. **Configure Google Sheets (Optional)**

Edit `.env` with your Google Sheets IDs:

```env
# Google Sheets Configuration
VITE_SHEET_PUBLISHED_BASE=https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub

# Sheet IDs (gids) - Copy from your published sheet
VITE_SHEET_ID_ENG=170422884
VITE_SHEET_ID_N5=1880022279
VITE_SHEET_ID_N4=1234567890
# ... more sheet IDs

# Optional
VITE_APP_TITLE=Vocabulary Quiz
VITE_DEFAULT_GID=170422884
```

### Running the Application

**Development Mode**

```bash
npm run dev
# Open http://localhost:5173
```

**Build for Production**

```bash
npm run build
npm run preview
```

**Sync Data from Google Sheets**

```bash
npm run sync
```

---

## 📁 Project Architecture

### Root Level Structure

```
vocab-quiz-react/
├── 📄 Configuration & Setup
│   ├── vite.config.js              # Vite bundler setup
│   ├── eslint.config.js            # ESLint code quality rules
│   ├── .prettierrc                 # Code formatter config
│   ├── package.json                # Dependencies & npm scripts
│   ├── package-lock.json           # Locked dependency versions
│   ├── index.html                  # HTML entry point
│   ├── .env (local)                # Environment variables (DO NOT COMMIT)
│   ├── .env.example                # Environment template (commit this)
│   └── .gitignore                  # Git exclusions
│
├── 📚 Documentation
│   ├── README.md                   # Project documentation
│   ├── CONTRIBUTING.md             # Guide for contributors
│   └── LICENSE                     # MIT License
│
├── 🔧 Automation Scripts (scripts/)
│   ├── sync-sheets.cjs             # Google Sheets → JSON sync
│   ├── update_hanviet.cjs          # Han-Viet kanji processor
│   └── hanviet_dict.cjs            # Dictionary data processor
│
├── 🌐 API (api/)
│   └── sheets.js                   # Google Sheets API client
│
├── 📦 Public Assets (public/)
│   └── Static files, icons, favicon
│
├── 📦 Source Code (src/) — See detailed structure below
│
└── 📚 Build Output (dist/) — Generated on `npm run build`
```

### Source Code Structure (src/)

```
src/
│
├── 📖 Application Entry Points
│   ├── main.jsx                    # React DOM root
│   ├── App.jsx                     # Main app component + routing
│   └── App.css                     # Global styles
│
├── 🧩 Components (components/) — Organized by Feature
│   │
│   ├── 📚 LEARNING MODES
│   │   ├── quiz/                   # Multiple choice quiz interface
│   │   │   ├── QuizScreen.jsx
│   │   │   └── QuizScreen.css
│   │   ├── flashcard/              # Spaced repetition flashcards
│   │   │   ├── FlashcardScreen.jsx
│   │   │   └── FlashcardScreen.css
│   │   ├── dictionary/             # Word search & lookup
│   │   │   └── DictionaryScreen.jsx
│   │   ├── grammar/                # Grammar lessons & patterns
│   │   │   └── GrammarScreen.jsx
│   │   ├── result/                 # Quiz result summary
│   │   │   ├── ResultScreen.jsx
│   │   │   └── ResultScreen.css
│   │   └── review/                 # Error & weak points review
│   │       ├── ReviewScreen.jsx
│   │       └── ReviewScreen.css
│   │
│   ├── 🏠 NAVIGATION & LAYOUT
│   │   ├── layout/                 # Main app layout wrapper
│   │   │   ├── Layout.jsx
│   │   │   ├── Layout.css
│   │   │   └── Sidebar.jsx         # Navigation sidebar
│   │   └── start/                  # Homepage & level selection
│   │       ├── StartScreen.jsx
│   │       ├── StartScreenClassic.jsx
│   │       ├── StartScreen.css
│   │       ├── SearchBar.jsx       # Vocabulary search component
│   │       └── SettingsPanel.jsx   # Quick settings panel
│   │
│   ├── 👤 AUTHENTICATION & PROFILE
│   │   ├── auth/                   # Login/Register screens
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── RegisterScreen.jsx
│   │   │   └── LoginScreen.css
│   │   ├── profile/                # User profile & progress
│   │   │   ├── UserProfile.jsx
│   │   │   └── UserProfile.css
│   │   └── settings/               # User preferences
│   │       └── SettingsScreen.jsx
│   │
│   └── 🎨 COMMON COMPONENTS
│       ├── common/
│       │   ├── Footer.jsx          # App footer
│       │   ├── Footer.css
│       │   ├── RubyText.jsx        # Ruby text for kanji
│       │   ├── SeasonalEffects.jsx # Holiday/seasonal themes
│       │   └── SeasonalEffects.css
│
├── 🎯 State Management
│   ├── context/
│   │   └── AppContext.jsx          # Global app state (theme, user, etc.)
│   ├── hooks/
│   │   ├── useVocabulary.js        # Vocabulary data & operations
│   │   └── useQuiz.js              # Quiz state & logic
│
├── 🔌 Services (services/) — Business Logic
│   ├── vocabularyService.js        # Vocabulary CRUD operations
│   ├── authService.js              # User authentication & management
│   ├── progressService.js          # Learning progress tracking
│   ├── bookmarkService.js          # Saved words management
│   ├── kanjiService.js             # Kanji lookup & data
│   └── seasonalService.js          # Lunar calendar & holiday events
│
├── 🛠️ Utilities & Helpers
│   ├── utils/
│   │   └── lunarCalendar.js        # Lunar date calculations
│   └── helpers/
│       └── index.js                # Common helper functions
│           ├── Array shuffling, grouping, filtering
│           ├── String & number formatting
│           ├── Validation functions
│           ├── Object cloning, merging
│           └── Debounce & utility functions
│
├── ⚙️ Constants (constants/)
│   └── index.js                    # App-wide constant definitions
│       ├── LEVELS, QUIZ_MODES
│       ├── THEMES, STORAGE_KEYS
│       ├── SHORTCUTS, ROUTES
│       ├── API_ENDPOINTS
│       └── SCORE_THRESHOLDS
│
├── 🎨 Design System (styles/)
│   ├── variables.css               # CSS custom properties (colors, fonts)
│   ├── reset.css                   # CSS reset & normalization
│   └── animations.css              # Reusable animations & transitions
│
├── 💾 Data (data/) — JLPT Vocabulary Banks & Caches
│   ├── voca.json                   # All vocabulary combined
│   ├── voca_n1.json                # JLPT N1 vocabulary (2,000+)
│   ├── voca_n2.json                # JLPT N2 vocabulary (3,000+)
│   ├── voca_n3.json                # JLPT N3 vocabulary (2,500+)
│   ├── voca_n4.json                # JLPT N4 vocabulary (1,800+)
│   ├── voca_n5.json                # JLPT N5 vocabulary (1,500+)
│   ├── voca_augmented.json         # Extended vocabulary dataset
│   ├── kanji_bank_1.json           # Kanji database 1 (1,000+)
│   ├── kanji_bank_2.json           # Kanji database 2 (500+)
│   └── sheets/                     # Google Sheets cache (auto-synced)
│       ├── sheet_eng.json          # Cached English-Vietnamese synced data
│       ├── sheet_n1.json           # JLPT N1 synced data
│       ├── sheet_n2.json           # JLPT N2 synced data
│       ├── sheet_n3.json           # JLPT N3 synced data
│       ├── sheet_n4.json           # JLPT N4 synced data
│       ├── sheet_n5.json           # JLPT N5 synced data
│       ├── sheet_jlpt.json         # Combined JLPT data
│       ├── sheet_grammar.json      # Grammar patterns
│       └── _sync_meta.json         # Sync metadata & timestamps
│
├── 📚 English-Vietnamese Dictionary (open-vn-en-dict-master/)
│   # Python-based dictionary data processing & sources
│   ├── 🔤 PRIMARY DATA
│   │   └── words.json              # MAIN: Eng-Vi dictionary (5.8 MB, enriched)
│   │
│   ├── 📖 RAW DICTIONARY SOURCES
│   │   ├── tracau.json             # Trà Câu source (7.2 MB)
│   │   ├── goodWords.json          # High-quality vocabulary (1.8 MB)
│   │   ├── goodWords1.json         # Extended quality vocab (1.8 MB)
│   │   ├── suggests.json           # Suggestions & variations (1.5 MB)
│   │   ├── errors.json             # Error corrections (4.8 MB)
│   │   ├── rerun.json              # Processing logs (4.8 MB)
│   │   ├── logs.json               # Additional logs (7.8 MB)
│   │   └── aa.json                 # Auxiliary entries
│   │
│   ├── 🐍 PROCESSING SCRIPTS
│   │   ├── main.py                 # Dictionary merge & aggregation
│   │   ├── cambridge.py            # Cambridge dictionary scraper
│   │   ├── tracau.py               # Trà Câu parser
│   │   ├── soha.py                 # Soha parser
│   │   ├── vndicnet.py             # VNDiCnet parser
│   │   ├── laban.py                # Laban parser
│   │   ├── store.py                # Data storage handler
│   │   ├── process.py              # Data processor & filter
│   │   └── oxfordlearnersdictionaries.py # Oxford parser
│   │
│   ├── 📊 PROCESSING DATA
│   │   ├── data/                   # Processing intermediates
│   │   ├── data1/                  # Alternative processing data
│   │   ├── html/                   # Cached HTML pages
│   │   └── voice/                  # Audio files
│   │
│   └── 📝 DOCUMENTATION
│       ├── README.md               # Dictionary processing guide
│       ├── requirements.txt        # Python dependencies
│       └── LICENSE                 # License
│
├── 📸 Images & Assets (assets/)
│   └── Images, icons, logos, media files
│
└── 🌍 Static Files (public/)
    └── Favicons, robots.txt, static assets

```

### Data Architecture Summary

**JLPT Vocabulary (bundled with React app):**

- Files: `src/data/voca_n*.json` (direct import)
- Cache: `src/data/sheets/sheet_n*.json` (synced from Google Sheets)
- Total: ~10 MB
- Updated: `npm run sync` from Google Sheets

**English-Vietnamese Dictionary (external processing):**

- Primary: `src/open-vn-en-dict-master/words.json` (5.8 MB)
- Raw sources: Multiple dictionary scrapers (tracau, cambridge, soha, etc.)
- Processing: Python scripts for merging, deduplication, enrichment
- Total sources: ~35 MB (tracau + goodWords + errors + logs + rerun)
- Updated: Manual processing + custom scripts

### Component Organization Strategy

**By Feature (Feature-First Approach):**

- **Quiz** - All quiz-related components
- **Flashcard** - Spaced repetition interface
- **Dictionary** - Word lookup functionality
- **Grammar** - Grammar lesson screens
- **Auth** - Login/Register flows
- **Layout** - Navigation & structure
- **Common** - Reusable UI components

This structure makes it easy to:

- 🎯 Locate features quickly
- 📦 Maintain component dependencies
- ♻️ Reuse common components
- 🧹 Scale without duplication

---

## 🛠️ Technology Stack

| Category               | Technology        | Purpose                          |
| ---------------------- | ----------------- | -------------------------------- |
| **Runtime**            | Node.js 16+       | JavaScript runtime               |
| **Frontend Framework** | React 19.2        | UI components & state management |
| **Build Tool**         | Vite              | Fast module bundling             |
| **Routing**            | React Router 7.13 | Client-side navigation           |
| **Styling**            | CSS Grid/Flexbox  | Responsive layouts               |
| **State**              | React Context API | Global app state                 |
| **Storage**            | LocalStorage      | Client-side caching              |
| **Data Sync**          | Google Sheets API | Content management               |
| **Code Quality**       | ESLint 9.39       | Code linting                     |
| **Package Manager**    | npm               | Dependency management            |

---

## 📖 Usage Guide

### 1️⃣ Taking a Quiz

- Select vocabulary level (N5, N4, N3, N2, N1, or English)
- Choose quiz mode: **Random** (mixed topics) or **Sequential** (ordered)
- Answer multiple-choice questions
- View results with score breakdown
- Review incorrect answers

**Keyboard Shortcuts:**

- `1-4`: Select answer options
- `Enter`: Check answer / Next question
- `Esc`: Exit quiz

### 2️⃣ Using Flashcards

- Select vocabulary set
- Flip cards with `Space` bar
- Navigate with `Arrow Keys`
- Mark as difficult for later review

### 3️⃣ Dictionary Search

- Use search bar on home screen
- Look up English or Japanese words
- View translations and usage examples
- Save words to bookmarks

### 4️⃣ Grammar Study

- Browse grammar patterns by level
- Study explanations and examples
- Test understanding with exercises

### 5️⃣ Managing Progress

- View streak and daily goals
- Track statistics by vocabulary level
- Review bookmarked words
- Export learning data

---

## ⚙️ Environment Variables

**Comprehensive list of configuration options:**

```env
# Google Sheets Configuration (Optional - for content management)
VITE_SHEET_PUBLISHED_BASE=https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub
VITE_SHEET_ID_ENG=170422884
VITE_SHEET_ID_N5=1880022279
VITE_SHEET_ID_N4=1234567890
VITE_SHEET_ID_N3=9876543210
VITE_SHEET_ID_N2=5555555555
VITE_SHEET_ID_N1=4444444444
VITE_SHEET_ID_JLPT=3333333333
VITE_SHEET_ID_GRAMMAR=2222222222

# Application Settings (Optional)
VITE_APP_TITLE=Vocabulary Quiz
VITE_DEFAULT_GID=170422884
VITE_DEFAULT_THEME=light
VITE_ENABLE_SEASONAL_EFFECTS=true
```

**Note:** `.env` file is **never committed** to version control. Use `.env.example` as a template.

---

## 🚢 Deployment

### Local Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
# Output: dist/ folder
```

### Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel/Netlify

1. **Build the app**

   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting platform

3. **Set environment variables** on your hosting platform's dashboard

4. **Enable automatic deployments** from Git

**Supported Platforms:**

- Vercel (recommended for React projects)
- Netlify
- AWS Amplify
- GitHub Pages (static hosting)
- Firebase Hosting

---

## 🔄 Data Management

### Auto-Sync from Google Sheets

The app automatically syncs vocabulary data from Google Sheets:

```bash
# Manual sync
npm run sync

# Pre-dev sync (runs before npm run dev)
npm run predev

# Pre-build sync (runs before npm run build)
npm run prebuild
```

### Supported Data Formats

- **JSON**: Native format for all vocabulary banks
- **Google Sheets**: Published as CSV, converted to JSON
- **CSV**: Importable via auth service
- **Plain Text**: Dictionary lookup support

---

## 🎓 Learning Path

### Beginner (N5-N4)

1. Start with **JLPT N5** - 1,500 essential words
2. Complete all vocabulary quizzes
3. Practice with flashcards
4. Review weak areas

### Intermediate (N3-N2)

1. Progress to **JLPT N3-N2** vocabulary
2. Study grammar patterns for each level
3. Combine quiz + flashcard learning
4. Use dictionary for unknown words

### Advanced (N1)

1. Master **JLPT N1** - 2,000+ advanced words
2. Study complex grammar structures
3. Review kanji and rare vocabulary
4. Practice with example sentences

### English-Vietnamese

1. Learn **1,600+ common English words**
2. Build vocabulary across multiple topics
3. Use in context with explanations
4. Reinforce with repeated quizzes

---

## 📊 Statistics & Analytics

The app tracks:

- **Quiz scores** by vocabulary level
- **Time spent** on each level
- **Correct/Incorrect** answer ratios
- **Streak information** (current, longest)
- **Bookmarks** and saved words
- **Learning velocity** (words/day)

Access statistics from **User Profile** → **Statistics**

---

## 🐛 Troubleshooting

### App won't load

- Clear browser cache and LocalStorage
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check console for error messages

### Data not syncing

- Verify `.env` variables are set correctly
- Check Google Sheets are published
- Run `npm run sync` manually
- Check internet connection

### Keyboard shortcuts not working

- Ensure focus is on the app (not address bar)
- Check if browser extensions block inputs
- Try different keyboard layout

### Slow performance

- Reduce quiz size (fewer questions)
- Disable seasonal effects temporarily
- Clear browser cache
- Use lighter vocabulary levels

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style

- Follow ESLint configuration
- Use React Hooks (function components)
- Keep components focused and reusable
- Document complex logic with comments

---

## 📈 Roadmap

### Upcoming Features

- [ ] **Advanced Analytics**: Detailed progress charts and insights
- [ ] **AI-Powered Difficulty**: Adaptive quiz difficulty based on performance
- [ ] **Spaced Repetition Algorithm**: SM-2 scheduling system
- [ ] **Collaborative Learning**: Group quizzes and shared decks
- [ ] **Mobile App**: React Native version for iOS/Android
- [ ] **Voice Pronunciation**: Audio examples for all vocabulary
- [ ] **Community Decks**: User-created vocabulary sets
- [ ] **Offline Mode**: Full offline functionality with sync

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

For issues, questions, or feedback:

- **GitHub Issues**: Report bugs and request features
- **Email**: [Your Contact Email]
- **Discord**: [Community Server Link]

---

## 🙏 Acknowledgments

- Vocabulary data sourced from authentic Japanese learning materials
- Kanji data from public kanji databases
- Community contributions and feedback

**Happy Learning! 🎌📚**

---

_Last Updated: February 2026_
_Version: 2.0.0 (Multi-Language Edition)_
