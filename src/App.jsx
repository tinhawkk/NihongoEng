import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/layout/Layout";

// Tools and Providers
import { useUserStore } from "./store/useUserStore";
import { SyncProvider } from "./components/SyncProvider";
import { WaterReminderProvider } from "./components/WaterReminderProvider";
import { DevtoolsBlockScreen } from "./components/DevtoolsBlockScreen";
import { useDevtoolsDetector } from "./hooks/useDevtoolsDetector";
import { PomodoroMini } from "./components/PomodoroMini";
import { ScrollManager } from "./components/ScrollManager";
import { ToastProvider } from "./components/ui/Toast";
import { GlobalLoader } from "./components/ui/GlobalLoader";
import "./App.css";

// Lazy-loaded routes for massive performance boost
const DictionaryScreen = React.lazy(() => import("./pages/DictionaryScreen").then(m => ({ default: m.DictionaryScreen })));
const DeckPage = React.lazy(() => import("./pages/DeckPage").then(m => ({ default: m.DeckPage })));
const QuizPage = React.lazy(() => import("./pages/QuizPage").then(m => ({ default: m.QuizPage })));
const FlashcardPage = React.lazy(() => import("./pages/FlashcardPage").then(m => ({ default: m.FlashcardPage })));
const BookmarkPage = React.lazy(() => import("./pages/BookmarkPage").then(m => ({ default: m.BookmarkPage })));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const PomodoroPage = React.lazy(() => import("./pages/PomodoroPage").then(m => ({ default: m.PomodoroPage })));
const SpeedGamePage = React.lazy(() => import("./pages/SpeedGamePage").then(m => ({ default: m.SpeedGamePage })));
const ExampleSpeakPage = React.lazy(() => import("./pages/ExampleSpeakPage").then(m => ({ default: m.ExampleSpeakPage })));
const GrammarPage = React.lazy(() => import("./pages/GrammarPage").then(m => ({ default: m.GrammarPage })));
const ReadingPage = React.lazy(() => import("./pages/ReadingPage").then(m => ({ default: m.ReadingPage })));
const KanjiExplorerPage = React.lazy(() => import("./pages/KanjiExplorerPage").then(m => ({ default: m.KanjiExplorerPage })));
const RadicalsPage = React.lazy(() => import("./pages/RadicalsPage").then(m => ({ default: m.RadicalsPage })));
const SRSPage = React.lazy(() => import("./pages/SRSPage").then(m => ({ default: m.SRSPage })));
const TypingPage = React.lazy(() => import("./pages/TypingPage").then(m => ({ default: m.TypingPage })));
const LearnPage = React.lazy(() => import("./pages/LearnPage").then(m => ({ default: m.LearnPage })));
const JLPTExamsListPage = React.lazy(() => import("./pages/JLPTExamsListPage").then(m => ({ default: m.JLPTExamsListPage })));
const JLPTExamDetailPage = React.lazy(() => import("./pages/JLPTExamDetailPage").then(m => ({ default: m.JLPTExamDetailPage })));

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/dictionary" element={<PageTransition><DictionaryScreen /></PageTransition>} />
        <Route path="/grammar" element={<PageTransition><GrammarPage /></PageTransition>} />
        <Route path="/grammar/:view/:id" element={<PageTransition><GrammarPage /></PageTransition>} />
        <Route path="/kanji" element={<PageTransition><KanjiExplorerPage /></PageTransition>} />
        <Route path="/radicals" element={<PageTransition><RadicalsPage /></PageTransition>} />
        <Route path="/deck/:deckId" element={<PageTransition><DeckPage /></PageTransition>} />
        <Route path="/learn/:deckId" element={<PageTransition><LearnPage /></PageTransition>} />
        <Route path="/quiz/:deckId" element={<PageTransition><QuizPage /></PageTransition>} />
        <Route path="/flashcards/:deckId" element={<PageTransition><FlashcardPage /></PageTransition>} />
        <Route path="/bookmarks" element={<PageTransition><BookmarkPage /></PageTransition>} />
        <Route
          path="/leaderboard"
          element={
            <PageTransition>
              <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 text-slate-400">
                Bảng xếp hạng sẽ có ở phiên bản tới! 🏆
              </div>
            </PageTransition>
          }
        />
        <Route path="/pomodoro" element={<PageTransition><PomodoroPage /></PageTransition>} />
        <Route
          path="/speed-game"
          element={<Navigate to="/game/speed-60s" replace />}
        />
        <Route path="/game/speed-60s" element={<PageTransition><SpeedGamePage /></PageTransition>} />
        <Route path="/game/speak/:deckId" element={<PageTransition><ExampleSpeakPage /></PageTransition>} />
        <Route path="/kanji-explorer" element={<PageTransition><KanjiExplorerPage /></PageTransition>} />
        <Route path="/reading" element={<PageTransition><ReadingPage /></PageTransition>} />
        <Route path="/jlpt-exams" element={<PageTransition><JLPTExamsListPage /></PageTransition>} />
        <Route path="/jlpt-exams/:examId" element={<PageTransition><JLPTExamDetailPage /></PageTransition>} />
        <Route path="/typing/:deckId" element={<PageTransition><TypingPage /></PageTransition>} />
        <Route path="/srs" element={<PageTransition><SRSPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const theme = useUserStore(state => state.theme);
  const devtoolsOpen = useDevtoolsDetector();

  React.useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <SyncProvider>
      <WaterReminderProvider>
        {/* {devtoolsOpen && <DevtoolsBlockScreen />} */}
        <Router>
          <ScrollManager />
          <PomodoroMini />
          <ToastProvider />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<GlobalLoader />}>
                      <AnimatedRoutes />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </WaterReminderProvider>
    </SyncProvider>
  );
}

export default App;
