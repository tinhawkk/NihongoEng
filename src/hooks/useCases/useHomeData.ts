import { useState, useEffect, useMemo } from "react";
import { nhostService, createCommunityRoot } from "../../services/nhostService";
import { getSeasonalEvent, getDailyQuote, checkLunarEvents } from "../../services/seasonalService";
import { getDueItems } from "../../utils/srsUtils";
import { useUserStore } from "../../store/useUserStore";

export const useHomeData = () => {
  const { account } = useUserStore();
  const srsData = account?.srsData || {};
  
  const [event, setEvent] = useState(getSeasonalEvent());
  const [quote, setQuote] = useState(getDailyQuote());
  const [communityTree, setCommunityTree] = useState<any[]>([]);
  const [contentCategories, setContentCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [randomSrsWords, setRandomSrsWords] = useState<any[]>([]);

  // Calculate SRS Reviews
  const dueItems = useMemo(() => {
    return getDueItems(srsData);
  }, [srsData]);

  useEffect(() => {
    const allSrsItems = Object.values(srsData);
    if (allSrsItems.length > 0) {
      const shuffled = [...allSrsItems].sort(() => 0.5 - Math.random());
      setRandomSrsWords(shuffled.slice(0, 2));
    }
  }, [account?.srsData]);

  useEffect(() => {
    setEvent(getSeasonalEvent());
    setQuote(getDailyQuote());

    checkLunarEvents().then(lunarEvent => {
      if (lunarEvent) setEvent(lunarEvent);
    });
  }, []);

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const [folders, decks] = await Promise.all([
        nhostService.getCommunityFolders(),
        nhostService.getCommunityDecks(),
      ]);

      console.log("[useHomeData] Fetched folders:", folders.length);
      console.log("[useHomeData] Fetched decks:", decks.length);

      const folderMap: Record<string, any> = {};
      folders.forEach(f => {
        folderMap[f.id] = { ...f, subfolders: [], decks: [] };
      });

      const roots: any[] = [];
      const orphanedDecks: any[] = [];

      decks.forEach(d => {
        const mappedDeck = {
          ...d,
          total_vocab: d.my_vocabulary_aggregate?.aggregate?.count || d.count || 0
        };
        if (d.community_folder_id && folderMap[d.community_folder_id]) {
          folderMap[d.community_folder_id].decks.push(mappedDeck);
        } else {
          orphanedDecks.push(mappedDeck);
        }
      });

      folders.forEach(f => {
        const folderObj = folderMap[f.id];
        if (!f.parent_id) {
          roots.push(folderObj);
        } else if (folderMap[f.parent_id]) {
          folderMap[f.parent_id].subfolders.push(folderObj);
        }
      });

      if (orphanedDecks.length > 0) {
        roots.push({
          id: "orphaned_root",
          title: "Chưa phân loại",
          description: "Các bài học chưa được đưa vào danh mục",
          subfolders: [],
          decks: orphanedDecks
        });
      }

      setCommunityTree(roots);
    } catch (e) {
      console.error("Failed to load community data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
    nhostService.getContentCategories().then(setContentCategories);
  }, []);

  // Pre-compute SRS due counts per deck for fast lookup
  const groupedCategories = useMemo(() => {
    const result: Record<string, any[]> = { premium: [], japanience: [], mori: [], main: [], specialty: [], english: [], other: [] };
    contentCategories.forEach(cat => {
      const root = communityTree.find(r => r.id === cat.root_folder_id);
      const item = { ...cat, root };
      
      const type = cat.type?.toLowerCase();
      if (result[type]) {
        result[type].push(item);
      } else {
        result.other.push(item);
      }
    });
    return result;
  }, [contentCategories, communityTree]);

  const dueCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    const todayStr = new Date().toLocaleDateString("en-CA");
    Object.values(srsData).forEach((item: any) => {
      const nextReview = item.nextReview
        ? new Date(item.nextReview).toLocaleDateString("en-CA")
        : "";
      const isDue = nextReview <= todayStr;
      if (isDue) {
        if (item.deckName) counts[item.deckName] = (counts[item.deckName] || 0) + 1;
        if (item.deck) counts[item.deck] = (counts[item.deck] || 0) + 1;
        if (item.deckId) counts[item.deckId] = (counts[item.deckId] || 0) + 1;
      }
    });
    return counts;
  }, [srsData]);

  // Flatten logic
  const allDecks = useMemo(() => {
    const flattenDecks = (folders: any[], rootTitle: string, parentTitle = "(Gốc)") => {
      let result: any[] = [];
      folders.forEach(f => {
        if (f.decks) {
          result.push(...f.decks.map((d: any) => ({ ...d, rootTitle, subTitle: parentTitle })));
        }
        if (f.subfolders) {
          result.push(...flattenDecks(f.subfolders, rootTitle, f.title));
        }
      });
      return result;
    };

    const decks = communityTree.flatMap(root => {
      const rootDecks = (root.decks || []).map((d: any) => ({
        ...d,
        rootTitle: root.title,
        subTitle: "(Gốc)",
      }));
      const subDecks = root.subfolders ? flattenDecks(root.subfolders, root.title) : [];
      return [...rootDecks, ...subDecks];
    });

    const seen = new Set();
    return decks.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [communityTree]);

  const allFolders = useMemo(() => {
    const flattenFolders = (folders: any[], rootTitle: string) => {
      let result: any[] = [];
      folders.forEach(f => {
        result.push({ id: f.id, title: f.title, isRoot: false, rootTitle });
        if (f.subfolders) {
          result.push(...flattenFolders(f.subfolders, rootTitle));
        }
      });
      return result;
    };

    return communityTree.flatMap(root => {
      const roots = [{ id: root.id, title: root.title, isRoot: true, rootTitle: root.title }];
      const subfolders = root.subfolders ? flattenFolders(root.subfolders, root.title) : [];
      return [...roots, ...subfolders];
    });
  }, [communityTree]);

  // Actions
  const handleCreateRoot = async (title: string, description: string) => {
    await createCommunityRoot({ title, description });
    await fetchCommunityData();
  };

  const handleCreateDeck = async (title: string, description: string, folderId: string) => {
    const { data, errors } = await nhostService.createDeck({
      title,
      description,
      community_folder_id: folderId,
    });
    if (errors?.length) throw new Error(errors[0].message);
    await fetchCommunityData();
    return data?.insert_decks_one;
  };

  const handleCreateFolder = async (title: string, parentId: string) => {
    const { data, errors } = await nhostService.createFolder({
      title,
      description: "",
      parent_id: parentId,
    });
    if (errors?.length) throw new Error(errors[0].message);
    await fetchCommunityData();
  };

  const handleEditFolder = async (folderId: string, oldTitle: string) => {
    const newTitle = prompt("Nhập tên mới cho danh mục:", oldTitle);
    if (!newTitle || newTitle === oldTitle) return;
    await nhostService.updateFolder(folderId, newTitle);
    await fetchCommunityData();
  };

  const handleDeleteFolder = async (folder: any) => {
    if (!confirm(`Bạn có CHẮC CHẮN muốn XÓA danh mục "${folder.title}" không? Toàn bộ bài học bên trong sẽ bị lỗi nếu xóa danh mục chứa chúng.`)) return;
    await nhostService.deleteFolder(folder.id);
    await fetchCommunityData();
  };

  const handleEditDeck = async (deck: any) => {
    const newTitle = prompt("Nhập tên mới cho bài học:", deck.title);
    if (!newTitle || newTitle === deck.title) return;
    await nhostService.updateDeck(deck.id, newTitle);
    await fetchCommunityData();
  };

  const handleDeleteDeck = async (deck: any) => {
    if (!confirm(`Xóa bài học "${deck.title}"?`)) return;
    await nhostService.deleteDeck(deck.id);
    useUserStore.getState().removeSrsByDeck(deck.id);
    await fetchCommunityData();
  };

  const handleSaveVocab = async (formData: any) => {
    const { deck_id, raw_json, ...vocabData } = formData;
    const deck = allDecks.find(d => d.id === deck_id);

    const generateUUID = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const finalLevel = deck?.title?.toUpperCase() || deck_id?.toUpperCase() || "UNKNOWN";

    if (raw_json && raw_json.trim().startsWith("[")) {
      let parsed = JSON.parse(raw_json);
      if (Array.isArray(parsed)) {
        const bulkObjects = parsed.map((item: any) => ({
          ...item,
          id: generateUUID(),
          level: finalLevel,
          deck_id: deck_id,
        }));
        const { data, errors } = await nhostService.bulkInsertMyVoca(bulkObjects);
        if (errors?.length) throw new Error(errors[0].message);
        return { message: `Đã thêm ${bulkObjects.length} từ vựng từ JSON!` };
      }
    } else {
      const { deck_id, ...vocabDataToInsert } = formData;
      const { data, errors } = await nhostService.insertMyVoca({
        ...vocabDataToInsert,
        id: generateUUID(),
        level: finalLevel,
        deck_id: deck_id,
      });
      if (errors?.length) throw new Error(errors[0].message);
      return { message: "Đã thêm 1 từ vựng mới!" };
    }
  };

  const handleInitializeMori = async (deck: any) => {
    const { data } = await nhostService.createFolder({
      title: "Chương trình Dũng Mori",
      description: "Hệ thống bài giảng từ N5-N1",
      parent_id: null,
    });
    const rootId = data.insert_folders_one.id;

    if (deck.stages) {
      await Promise.all(
        deck.stages.map(async (stage: any) => {
          const { data: stageData } = await nhostService.createFolder({
            title: stage.title,
            description: "",
            parent_id: rootId,
          });
          const stageId = stageData.insert_folders_one.id;

          const cat = "Từ Vựng";
          const { data: catData } = await nhostService.createFolder({
            title: cat,
            description: `Chuyên mục ${cat}`,
            parent_id: stageId,
          });
          const catId = catData.insert_folders_one.id;

          const { data: chData } = await nhostService.createFolder({
            title: "Chương 1",
            description: "",
            parent_id: catId,
          });
          const chId = chData.insert_folders_one.id;

          await Promise.all([
            nhostService.createDeck({
              title: "Bài 1",
              description: "Kiến thức trọng tâm",
              community_folder_id: chId,
            }),
            nhostService.createDeck({
              title: "Ôn tập Chương 1",
              description: "Tổng hợp và kiểm tra",
              community_folder_id: chId,
            }),
          ]);
        })
      );
    }
    await fetchCommunityData();
    return rootId;
  };

  const handleQuickAddChapter = async (category: any, chapters: any[]) => {
    const nextNum = chapters.length + 1;
    await nhostService.createFolder({
      title: `Chương ${nextNum}`,
      description: "",
      parent_id: category.id,
    });
    await fetchCommunityData();
  };

  const handleQuickAddDeck = async (chapter: any) => {
    const nextNum = (chapter.decks || []).length + 1;
    await nhostService.createDeck({
      title: `Bài ${nextNum}`,
      description: "",
      community_folder_id: chapter.id,
    });
    await fetchCommunityData();
  };

  const handleQuickAddReviewDeck = async (chapter: any) => {
    try {
      await nhostService.createDeck({
        title: `Ôn tập ${chapter.title}`,
        description: "Bài ôn tập cuối chương",
        community_folder_id: chapter.id,
        custom_columns: { type: "review_chapter" },
      });
      await fetchCommunityData();
    } catch (err: any) {
      alert("Lỗi tạo bài ôn tập: " + err.message);
    }
  };

  return {
    event,
    quote,
    communityTree,
    contentCategories,
    loading,
    randomSrsWords,
    dueItems,
    groupedCategories,
    dueCountsMap,
    allDecks,
    allFolders,
    fetchCommunityData,
    handleCreateRoot,
    handleCreateDeck,
    handleCreateFolder,
    handleEditFolder,
    handleDeleteFolder,
    handleEditDeck,
    handleDeleteDeck,
    handleSaveVocab,
    handleInitializeMori,
    handleQuickAddChapter,
    handleQuickAddDeck,
    handleQuickAddReviewDeck,
  };
};
