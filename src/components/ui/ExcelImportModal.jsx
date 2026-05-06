import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSpreadsheet, Download, Upload, AlertTriangle, CheckCircle2, X } from "lucide-react";
import * as XLSX from "xlsx";
import { nhostService } from "../../services/nhostService";

/**
 * Reusable Excel Import Modal.
 */
export const ExcelImportModal = ({ open, onClose, deckId, onImportDone }) => {
  // ─── Excel column mapping logic (Moved inside to support Vite Fast Refresh) ───
  const COLUMN_ALIASES = {
    word: ["word", "từ vựng", "tu vung", "単語", "tango", "vocabulary", "kanji", "english", "en", "eng"],
    furigana: ["furigana", "reading", "hiragana", "phiên âm", "phien am", "đọc", "doc", "yomikata"],
    meaning: ["meaning", "nghĩa", "nghia", "ý nghĩa", "y nghia", "意味", "vietnamese", "vi", "en", "eng", "english meaning"],
    han_viet: ["han_viet", "hán việt", "han viet", "漢越", "sino-vietnamese"],
    onyomi: ["onyomi", "on", "音読み"],
    kunyomi: ["kunyomi", "kun", "訓読み"],
    mnemonic: ["mnemonic", "mẹo nhớ", "meo nho", "memo"],
    type: ["type", "loại", "loai"],
    romaji: ["romaji", "ローマ字"],
    example_jp: ["example_jp", "ví dụ jp", "vi du jp", "例文", "example", "câu ví dụ"],
    example_vi: ["example_vi", "ví dụ vi", "vi du vi", "dịch ví dụ", "example meaning"],
    level: ["level", "cấp độ", "cap do", "レベル", "trình độ"],
    radical_analysis: ["radical_analysis", "bộ thủ", "bo thu", "phân tích", "phan tich"],
    related_voca: ["related_voca", "từ liên quan", "tu lien quan", "liên quan", "lien quan", "related"],
  };

  const matchColumn = header => {
    const h = (header || "").toString().trim().toLowerCase();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(a => h === a || h.includes(a))) return field;
    }
    return null;
  };
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | preview | importing | done | error
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setImportResult(null);
    setErrorMsg("");
    setIsDragging(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = file => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) {
          setErrorMsg("File Excel trống, không có dữ liệu!");
          setStep("error");
          return;
        }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawRows(json);
        // Auto-map columns
        const autoMap = {};
        hdrs.forEach(h => {
          const matched = matchColumn(h);
          if (matched) autoMap[h] = matched;
        });
        setMapping(autoMap);
        setStep("preview");
      } catch (err) {
        setErrorMsg("Không đọc được file. Hãy chắc chắn đây là file Excel (.xlsx / .xls) hợp lệ.");
        setStep("error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = e => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const mappedFields = Object.values(mapping).filter(Boolean);
  const hasWord = mappedFields.includes("word");
  const hasMeaning = mappedFields.includes("meaning");
  const canImport = hasWord && hasMeaning && rawRows.length > 0;

  const handleImport = async () => {
    setStep("importing");
    try {
      // Build objects from mapping
      const objects = rawRows
        .map((row, idx) => {
          // Generate a valid UUID for each row (required by database)
          let uuid = "";
          if (typeof crypto !== "undefined" && crypto.randomUUID) {
            uuid = crypto.randomUUID();
          } else {
            uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
              var r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
          }

          const obj = {
            id: uuid,
            level: deckId.toUpperCase(),
          };
          for (const [excelCol, dbField] of Object.entries(mapping)) {
            if (dbField && row[excelCol] !== undefined) {
              obj[dbField] = String(row[excelCol]).trim();
            }
          }
          return obj;
        })
        .filter(o => o.word && o.word.trim());

      if (objects.length === 0) {
        setErrorMsg("Không có dòng hợp lệ nào (cột 'word' bị trống toàn bộ).");
        setStep("error");
        return;
      }

      // Batch in chunks of 50
      const BATCH = 50;
      let totalInserted = 0;
      for (let i = 0; i < objects.length; i += BATCH) {
        const chunk = objects.slice(i, i + BATCH);
        const { data, errors } = await nhostService.bulkInsertMyVoca(chunk);
        if (errors?.length) {
          console.error("[Excel Import] Batch error:", errors);
          setErrorMsg(`Lỗi ở batch ${Math.floor(i / BATCH) + 1}: ${errors[0].message}`);
          setStep("error");
          return;
        }
        totalInserted += data?.insert_my_vocabulary?.affected_rows || chunk.length;
      }

      setImportResult({ total: objects.length, inserted: totalInserted });
      setStep("done");
    } catch (err) {
      setErrorMsg(err.message || "Lỗi không xác định khi import.");
      setStep("error");
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "word",
        "type",
        "furigana",
        "meaning",
        "han_viet",
        "onyomi",
        "kunyomi",
        "mnemonic",
        "romaji",
        "example_jp",
        "example_vi",
        "radical_analysis",
        "related_voca",
      ],
      [
        "食べる",
        "voca",
        "たべる",
        "Ăn",
        "Thực",
        "",
        "",
        "Ăn bằng mồm (口) thì mới no",
        "taberu",
        "毎日ご飯を食べます",
        "Mỗi ngày tôi ăn cơm",
      ],
      [
        "水",
        "kanji",
        "みず",
        "Nước",
        "Thủy",
        "スイ",
        "みず",
        "Nước chảy quanh chân (脚)",
        "mizu",
        "水を飲みます",
        "Tôi uống nước",
      ],
    ]);
    ws["!cols"] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 10 },
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vocabulary");
    XLSX.writeFile(wb, `template_${deckId || "vocabulary"}.xlsx`);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Import từ Excel
                </h3>
                <p className="text-xs text-slate-400 font-bold">Hỗ trợ .xlsx, .xls, .csv</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Step: Upload */}
            {step === "upload" && (
              <>
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-300 cursor-pointer ${
                    isDragging
                      ? "border-green-500 bg-green-50 dark:bg-green-500/20 scale-[1.02] shadow-xl shadow-green-200/20"
                      : "border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-500/50"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center">
                    <Upload size={28} className="text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      Kéo thả hoặc nhấn để chọn file Excel
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      .xlsx, .xls, .csv — Tối đa 5000 dòng
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                  <Download size={16} /> Tải file mẫu (Template)
                </button>
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">
                    📋 Hướng dẫn:
                  </p>
                  <ul className="text-xs text-blue-600 dark:text-blue-300/80 space-y-1 font-medium">
                    <li>
                      • Cột bắt buộc: <strong>word</strong> (từ vựng) + <strong>meaning</strong>{" "}
                      (nghĩa)
                    </li>
                    <li>• Cột tùy chọn: furigana, han_viet, romaji, example_jp, example_vi</li>
                    <li>• Hệ thống tự nhận diện tên cột tiếng Việt, Nhật, Anh</li>
                    <li>• Dùng file mẫu để đảm bảo format chính xác nhất</li>
                  </ul>
                </div>
              </>
            )}

            {/* Step: Preview */}
            {step === "preview" && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-500" />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                      {fileName}
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                      {rawRows.length} dòng
                    </span>
                  </div>
                  <button
                    onClick={resetState}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Chọn file khác
                  </button>
                </div>

                {/* Column mapping */}
                <div className="space-y-3">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                    Ánh xạ cột:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {headers.map(h => (
                      <div
                        key={h}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2"
                      >
                        <span
                          className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[80px] truncate"
                          title={h}
                        >
                          {h}
                        </span>
                        <span className="text-slate-300">→</span>
                        <select
                          value={mapping[h] || ""}
                          onChange={e =>
                            setMapping(prev => ({ ...prev, [h]: e.target.value || null }))
                          }
                          className="flex-1 text-xs font-bold bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 outline-none"
                        >
                          <option value="">— Bỏ qua —</option>
                          <option value="word">word (Từ vựng) *</option>
                          <option value="furigana">furigana (Phiên âm)</option>
                          <option value="meaning">meaning (Nghĩa) *</option>
                          <option value="han_viet">han_viet (Hán Việt)</option>
                          <option value="romaji">romaji</option>
                          <option value="example_jp">example_jp (Ví dụ JP)</option>
                          <option value="example_vi">example_vi (Ví dụ VI)</option>
                          <option value="level">level (Cấp độ)</option>
                          <option value="radical_analysis">radical_analysis (Bộ thủ)</option>
                          <option value="related_voca">related_voca (Từ liên quan)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  {(!hasWord || !hasMeaning) && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-2">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-bold">
                        {!hasWord && !hasMeaning
                          ? "Cần ánh xạ cột 'word' và 'meaning'"
                          : !hasWord
                            ? "Cần ánh xạ cột 'word' (từ vựng)"
                            : "Cần ánh xạ cột 'meaning' (nghĩa)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview table */}
                <div className="border border-slate-200 dark:border-slate-600 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto max-h-52">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-black text-slate-500 dark:text-slate-400">
                            #
                          </th>
                          {headers
                            .filter(h => mapping[h])
                            .map(h => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left font-black text-slate-500 dark:text-slate-400 uppercase"
                              >
                                {mapping[h]}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            {headers
                              .filter(h => mapping[h])
                              .map(h => (
                                <td
                                  key={h}
                                  className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
                                >
                                  {String(row[h] ?? "")}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rawRows.length > 5 && (
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 text-xs text-slate-400 font-bold text-center border-t border-slate-200 dark:border-slate-600">
                      ...và {rawRows.length - 5} dòng nữa
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!canImport}
                    className={`flex-1 px-4 py-3 font-black rounded-2xl transition-all flex items-center justify-center gap-2 ${
                      canImport
                        ? "bg-[#58CC02] hover:bg-[#46A302] text-white shadow-lg shadow-green-200/50"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Upload size={16} /> Import {rawRows.length} từ vựng
                  </button>
                </div>
              </>
            )}

            {/* Step: Importing */}
            {step === "importing" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#58CC02] rounded-full animate-spin" />
                <p className="font-bold text-slate-600 dark:text-slate-300">
                  Đang import {rawRows.length} từ vựng...
                </p>
                <p className="text-xs text-slate-400">Vui lòng không đóng trang</p>
              </div>
            )}

            {/* Step: Done */}
            {step === "done" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-slate-800 dark:text-white">
                    Import thành công! 🎉
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Đã thêm <strong className="text-green-600">{importResult?.inserted}</strong> từ
                    vựng vào deck
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleClose();
                    onImportDone?.();
                  }}
                  className="px-6 py-3 bg-[#58CC02] hover:bg-[#46A302] text-white font-black rounded-2xl shadow-lg transition-all"
                >
                  Xong!
                </button>
              </div>
            )}

            {/* Step: Error */}
            {step === "error" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-slate-800 dark:text-white">Có lỗi xảy ra</p>
                  <p className="text-sm text-red-500 mt-1 max-w-md">{errorMsg}</p>
                </div>
                <button
                  onClick={resetState}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Thử lại
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
