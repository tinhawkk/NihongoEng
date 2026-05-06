const fs = require('fs');

let code = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');

// Replace imports first
code = code.replace(
  'import { renderMarkdownFurigana as renderFurigana } from "../utils/furigana";',
  'import { renderMarkdownFurigana as renderFurigana } from "../utils/furigana";\nimport { useHomeData } from "../hooks/useCases/useHomeData";'
);

const lines = code.split('\n');

const startStr = 'export const HomePage = () => {';
const midStr = '  const vocaFields = [';

let startIndex = -1;
let midIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(startStr)) startIndex = i;
  if (lines[i].includes(midStr) && startIndex !== -1 && midIndex === -1) midIndex = i;
}

if (startIndex === -1 || midIndex === -1) {
  process.exit(1);
}

const replacement = `export const HomePage = () => {
  const navigate = useNavigate();
  const bookmarks = useBookmarkStore(state => state.bookmarks);
  const { account, vocaSource, setVocaSource } = useUserStore();
  
  const {
    event, quote, communityTree, contentCategories, loading, randomSrsWords,
    dueItems, groupedCategories, dueCountsMap, allDecks, allFolders,
    fetchCommunityData, handleCreateRoot, handleCreateDeck, handleCreateFolder,
    handleEditFolder, handleDeleteFolder, handleEditDeck, handleDeleteDeck,
    handleSaveVocab, handleInitializeMori, handleQuickAddChapter, handleQuickAddDeck
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
      const el = document.getElementById("mori-content-" + levelId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };
`;

const beforeLines = lines.slice(0, startIndex);
const afterLines = lines.slice(midIndex);

let newCode = beforeLines.join('\n') + '\n' + replacement + '\n' + afterLines.join('\n');

const endStrStart = '  // Save single vocab OR bulk JSON array';
const endStrEnd = 'alert("Lỗi tạo bài nhanh: " + err.message);';

const endIndexStart = newCode.indexOf(endStrStart);
const endIndexEnd = newCode.indexOf(endStrEnd);

if (endIndexStart !== -1 && endIndexEnd !== -1) {
  // Find the closing brackets after the alert
  const endBlock = newCode.indexOf('  };\n', endIndexEnd);
  newCode = newCode.substring(0, endIndexStart) + newCode.substring(endBlock + 5);
}

newCode = newCode.replace(/\bhandleCreateRoot\b/g, '_handleCreateRoot');
newCode = newCode.replace(/\bhandleCreateFolder\b/g, '_handleCreateFolder');
newCode = newCode.replace(/\bhandleCreateDeck\b/g, '_handleCreateDeck');
newCode = newCode.replace(/\bhandleInitializeMori\b/g, '_handleInitializeMori');
newCode = newCode.replace(/\bhandleSaveVocab\b/g, '_handleSaveVocab');

newCode = newCode.replace(/_handleCreateRoot, _handleCreateDeck, _handleCreateFolder,/g, 'handleCreateRoot, handleCreateDeck, handleCreateFolder,');
newCode = newCode.replace(/_handleSaveVocab, _handleInitializeMori/g, 'handleSaveVocab, handleInitializeMori');

fs.writeFileSync('src/pages/HomePage.jsx', newCode);
console.log('Refactored successfully');
