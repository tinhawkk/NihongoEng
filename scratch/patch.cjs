const fs = require('fs');

let code = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');

// 1. Replace imports first
code = code.replace(
  'import { renderMarkdownFurigana as renderFurigana } from "../utils/furigana";',
  'import { renderMarkdownFurigana as renderFurigana } from "../utils/furigana";\nimport { useHomeData } from "../hooks/useCases/useHomeData";'
);

// 2. Find the first chunk: export const HomePage = () => { ... } up to const vocaFields = [
const startRegex = /export const HomePage = \(\) => \{[\s\S]*?const vocaFields = \[/;
const startMatch = startRegex.exec(code);

if (!startMatch) {
  console.error("Failed to find start match");
  process.exit(1);
}

const replacement1 = `export const HomePage = () => {
  const navigate = useNavigate();
  const bookmarks = useBookmarkStore(state => state.bookmarks);
  const { account, vocaSource, setVocaSource } = useUserStore();
  
  const {
    event, quote, communityTree, contentCategories, loading, randomSrsWords,
    dueItems, groupedCategories, dueCountsMap, allDecks, allFolders,
    fetchCommunityData, handleCreateRoot, handleCreateDeck, handleCreateFolder,
    handleEditFolder, handleDeleteFolder, handleEditDeck, handleDeleteDeck,
    handleSaveVocab, handleInitializeMori, handleQuickAddChapter, handleQuickAddDeck, handleQuickAddReviewDeck
  } = useHomeData();

  const [createRootOpen, setCreateRootOpen] = useState(false);
  const [newRootTitle, setNewRootTitle] = useState("");
  const [newRootDesc, setNewRootDesc] = useState("");
  const [createRootSaving, setCreateRootSaving] = useState(false);

  const _handleCreateRoot = async () => {
    if (!newRootTitle.trim()) return;
    setCreateRootSaving(true);
    try {
      await handleCreateRoot(newRootTitle, newRootDesc);
      setCreateRootOpen(false);
      setNewRootTitle("");
      setNewRootDesc("");
    } catch (e) {
      alert("Đã xảy ra lỗi khi tạo danh mục mới.");
    } finally {
      setCreateRootSaving(false);
    }
  };

  const [expandedLevelId, setExpandedLevelId] = useState(() => {
    return sessionStorage.getItem("home_expanded_level") || null;
  });

  useEffect(() => {
    if (expandedLevelId) {
      sessionStorage.setItem("home_expanded_level", expandedLevelId);
    } else {
      sessionStorage.removeItem("home_expanded_level");
    }
  }, [expandedLevelId]);

  const [levelModal, setLevelModal] = useState(null);

  const [addVocabOpen, setAddVocabOpen] = useState(false);
  const [crudSaving, setCrudSaving] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelPickerOpen, setExcelPickerOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");

  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [createDeckFolder, setCreateDeckFolder] = useState(null);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [createDeckSaving, setCreateDeckSaving] = useState(false);
  const [importAfterCreate, setImportAfterCreate] = useState(false);
  const [activeMoriStage, setActiveMoriStage] = useState(0);
  const [expandedMoriCategory, setExpandedMoriCategory] = useState(null);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParent, setCreateFolderParent] = useState(null);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [createFolderSaving, setCreateFolderSaving] = useState(false);

  const _handleSaveVocab = async (formData) => {
    setCrudSaving(true);
    try {
      const res = await handleSaveVocab(formData);
      if (res?.message) alert(res.message);
      setAddVocabOpen(false);
    } catch(err) {
      alert("Error: " + err.message);
    } finally {
      setCrudSaving(false);
    }
  };

  const handleOpenCreateDeck = (subfolder, rootTitle) => {
    setSelectedDeckId(subfolder.id);
    setCreateDeckFolder({ id: subfolder.id, title: subfolder.title, rootTitle });
    setNewDeckTitle("");
    setNewDeckDesc("");
    setCreateDeckOpen(true);
  };

  const handleOpenImportToFolder = (folder, rootTitle) => {
    setSelectedDeckId(folder.id);
    setImportAfterCreate(true);
    setExcelPickerOpen("CREATE_DECK");
  };

  const _handleCreateDeck = async () => {
    if (!newDeckTitle.trim() || !createDeckFolder) return;
    setCreateDeckSaving(true);
    try {
      const newDeck = await handleCreateDeck(newDeckTitle.trim(), newDeckDesc.trim(), createDeckFolder.id);
      if (newDeck && importAfterCreate) {
        setSelectedDeckId(newDeck.id);
        setExcelOpen(true);
        setImportAfterCreate(false);
      }
      setCreateDeckOpen(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCreateDeckSaving(false);
    }
  };

  const _handleCreateFolder = async () => {
    if (!newFolderTitle.trim() || !createFolderParent) return;
    setCreateFolderSaving(true);
    try {
      await handleCreateFolder(newFolderTitle.trim(), createFolderParent.id);
      setCreateFolderOpen(false);
      setNewFolderTitle("");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCreateFolderSaving(false);
    }
  };

  const [initializingMori, setInitializingMori] = useState(null);

  const _handleInitializeMori = async (deck) => {
    setInitializingMori(deck.id);
    try {
      const rootId = await handleInitializeMori(deck);
      setExpandedLevelId(rootId);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setInitializingMori(null);
    }
  };

  const scrollToMoriStage = (levelId, stageIdx) => {
    setActiveMoriStage(stageIdx);
    setTimeout(() => {
      const el = document.getElementById('mori-content-' + levelId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const vocaFields = [`;

code = code.substring(0, startMatch.index) + replacement1 + code.substring(startMatch.index + startMatch[0].length - 1);

// 3. Find the second chunk using English only
const endRegex = /];\s*\/\/\s*Save single vocab OR bulk JSON array[\s\S]*?const handleQuickAddReviewDeck[\s\S]*?\}\s*\};\s*(?=\bconst renderMoriTimeline\b)/;
const endMatch = endRegex.exec(code);

if (!endMatch) {
  console.error("Failed to find end match");
  process.exit(1);
}

code = code.substring(0, endMatch.index) + "];\n\n  " + code.substring(endMatch.index + endMatch[0].length);

// 4. Update function usages in JSX
code = code.replace(/\bhandleCreateRoot\b/g, '_handleCreateRoot');
code = code.replace(/\bhandleCreateFolder\b/g, '_handleCreateFolder');
code = code.replace(/\bhandleCreateDeck\b/g, '_handleCreateDeck');
code = code.replace(/\bhandleInitializeMori\b/g, '_handleInitializeMori');
code = code.replace(/\bhandleSaveVocab\b/g, '_handleSaveVocab');

// Revert hook usages
code = code.replace(/_handleCreateRoot, _handleCreateDeck, _handleCreateFolder,/g, 'handleCreateRoot, handleCreateDeck, handleCreateFolder,');
code = code.replace(/_handleSaveVocab, _handleInitializeMori/g, 'handleSaveVocab, handleInitializeMori');

fs.writeFileSync('src/pages/HomePage.jsx', code);
console.log('Refactored successfully');
