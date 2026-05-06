import { useState, useEffect } from "react";
import { vocabularyRepository } from "../../data/repositories/NhostVocabularyRepository";
import { nhostService } from "../../services/nhostService";
import { WordCard } from "../../types/vocabulary";

// Helper for generating UUID v4
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useDeckDetails = (deckId: string, source: string, isSrsDeck: boolean, srsData: any) => {
  const [words, setWords] = useState<WordCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deckMetadata, setDeckMetadata] = useState<any>(null);
  const [crudSaving, setCrudSaving] = useState(false);
  const [jsonImporting, setJsonImporting] = useState(false);
  const [radicals, setRadicals] = useState<any[]>([]);

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId);

  useEffect(() => {
    if (isUUID) {
      const q = `query GetDeckTitle($id: String!) {
        decks_by_pk(id: $id) {
          title
        }
      }`;
      nhostService.fetchGraphQL(q, "GetDeckTitle", { id: deckId }).then(res => {
        if (res.data?.decks_by_pk) {
          setDeckMetadata(res.data.decks_by_pk);
        }
      });
    }
  }, [deckId, isUUID]);

  const loadData = async () => {
    setLoading(true);
    if (isSrsDeck) {
      const allItems = Object.values(srsData || {});
      const sorted = allItems.sort(
        (a: any, b: any) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
      );
      setWords(sorted as WordCard[]);
      setLoading(false);
      return;
    }

    const data = await vocabularyRepository.loadDeck(deckId, source as any);
    setWords(data);
    setLoading(false);

    nhostService.getRadicals().then(setRadicals);
  };

  useEffect(() => {
    loadData();
  }, [deckId, source, isSrsDeck, srsData]);

  const handleCrudSave = async (
    crudMode: "create" | "edit",
    crudItem: any,
    formData: any,
    finalLevel: string
  ) => {
    setCrudSaving(true);
    try {
      const table = "my_vocabulary";
      const { raw_json, ...fields } = formData;

      if (crudMode === "create") {
        if (raw_json && raw_json.trim().startsWith("[")) {
          const parsed = JSON.parse(raw_json);
          if (Array.isArray(parsed)) {
            const bucket = parsed.map((item: any) => ({
              ...item,
              id: generateUUID(),
              level: finalLevel,
              deck_id: deckId,
            }));
            const { errors } = await nhostService.bulkInsertMyVoca(bucket);
            if (errors?.length) throw new Error(errors[0].message);
            await loadData();
            return { success: true, message: `Đã thêm thành công ${bucket.length} từ vựng!` };
          }
        } else {
          if (!fields.word?.trim() || !fields.meaning?.trim()) {
            throw new Error("Hãy nhập ít nhất 'Từ vựng' và 'Nghĩa' hoặc sử dụng ô nhập JSON.");
          }
          const obj = {
            ...fields,
            id: generateUUID(),
            level: finalLevel,
            deck_id: deckId,
            type: fields.onyomi || fields.kunyomi || fields.related_voca ? "kanji" : "voca",
          };
          const { errors } = await nhostService.createRow(table, obj);
          if (errors?.length) throw new Error(errors[0].message);
          setWords(prev => [obj, ...prev] as any[]);
          return { success: true, message: "Đã thêm thành công!" };
        }
      } else {
        const { id, ...setFields } = fields;
        const autoType =
          setFields.onyomi || setFields.kunyomi || setFields.related_voca ? "kanji" : "voca";
        const finalSet = { ...setFields, type: autoType };

        const { errors } = await nhostService.updateRow(table, crudItem.id, finalSet);
        if (errors?.length) throw new Error(errors[0].message);

        setWords(prev => prev.map(w => (w.id === crudItem.id ? { ...w, ...finalSet } : w)) as any[]);
        return { success: true, message: "Đã cập nhật!" };
      }
    } finally {
      setCrudSaving(false);
    }
  };

  const handleCrudDelete = async (id: string) => {
    setCrudSaving(true);
    try {
      const { errors } = await nhostService.deleteRow("my_vocabulary", id);
      if (errors?.length) throw new Error(errors[0].message);
      setWords(prev => prev.filter(w => w.id !== id));
      return { success: true };
    } finally {
      setCrudSaving(false);
    }
  };

  const handleJsonImport = async (jsonText: string, finalLevel: string) => {
    setJsonImporting(true);
    try {
      const parsed = JSON.parse(jsonText.trim());
      const bucket = parsed.map((item: any) => {
        const { radical_analysis, related_voca, ...rest } = item;
        return {
          ...rest,
          id: generateUUID(),
          level: finalLevel,
          deck_id: deckId,
          type: item.onyomi || item.kunyomi ? "kanji" : "voca",
        };
      });

      const { errors } = await nhostService.bulkInsertMyVoca(bucket);
      if (errors?.length) throw new Error(errors[0].message);

      await loadData();
      return { success: true, message: `✅ Đã thêm thành công ${bucket.length} từ vựng!` };
    } finally {
      setJsonImporting(false);
    }
  };

  return {
    words,
    setWords,
    loading,
    deckMetadata,
    radicals,
    crudSaving,
    jsonImporting,
    handleCrudSave,
    handleCrudDelete,
    handleJsonImport,
    loadData
  };
};

