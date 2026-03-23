import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/layout/Layout";
import { DictionaryScreen } from "./pages/DictionaryScreen";
import { DeckPage } from "./pages/DeckPage";
import { QuizPage } from "./pages/QuizPage";
import { FlashcardPage } from "./pages/FlashcardPage";
import { BookmarkPage } from "./pages/BookmarkPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PomodoroPage } from "./pages/PomodoroPage";
import { SpeedGamePage } from "./pages/SpeedGamePage";
import { GrammarPage } from "./pages/GrammarPage";
import { ReadingPage } from "./pages/ReadingPage";
import { KanjiExplorerPage } from "./pages/KanjiExplorerPage";
import { RadicalsPage } from "./pages/RadicalsPage";
import { SRSPage } from "./pages/SRSPage";
import { TypingPage } from "./pages/TypingPage";
import { LearnPage } from "./pages/LearnPage";
import { JLPTExamsListPage } from "./pages/JLPTExamsListPage";
import { JLPTExamDetailPage } from "./pages/JLPTExamDetailPage";
import { useUserStore } from "./store/useUserStore";
import { SyncProvider } from "./components/SyncProvider";
import { WaterReminderProvider } from "./components/WaterReminderProvider";
import { DevtoolsBlockScreen } from "./components/DevtoolsBlockScreen";
import { useDevtoolsDetector } from "./hooks/useDevtoolsDetector";
import { PomodoroMini } from "./components/PomodoroMini";
import { ScrollManager } from "./components/ScrollManager";
import { ToastProvider } from "./components/ui/Toast";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/dictionary" element={<DictionaryScreen />} />
                      <Route path="/grammar" element={<GrammarPage />} />
                      <Route path="/grammar/:view/:id" element={<GrammarPage />} />
                      <Route path="/kanji" element={<KanjiExplorerPage />} />
                      <Route path="/radicals" element={<RadicalsPage />} />
                      <Route path="/deck/:deckId" element={<DeckPage />} />
                      <Route path="/learn/:deckId" element={<LearnPage />} />
                      <Route path="/quiz/:deckId" element={<QuizPage />} />
                      <Route path="/flashcards/:deckId" element={<FlashcardPage />} />
                      <Route path="/bookmarks" element={<BookmarkPage />} />
                      <Route
                        path="/leaderboard"
                        element={
                          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 text-slate-400">
                            Bảng xếp hạng sẽ có ở phiên bản tới! 🏆
                          </div>
                        }
                      />
                      <Route path="/pomodoro" element={<PomodoroPage />} />
                      <Route
                        path="/speed-game"
                        element={<Navigate to="/game/speed-60s" replace />}
                      />
                      <Route path="/game/speed-60s" element={<SpeedGamePage />} />
                      <Route path="/kanji-explorer" element={<KanjiExplorerPage />} />
                      <Route path="/reading" element={<ReadingPage />} />
                      <Route path="/jlpt-exams" element={<JLPTExamsListPage />} />
                      <Route path="/jlpt-exams/:examId" element={<JLPTExamDetailPage />} />
                      <Route path="/typing/:deckId" element={<TypingPage />} />
                      <Route path="/srs" element={<SRSPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
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
