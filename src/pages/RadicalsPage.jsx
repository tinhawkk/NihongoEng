import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Layers, Upload } from "lucide-react";
import { nhostService } from "../services/nhostService";

export const RadicalsPage = () => {
  const navigate = useNavigate();
  const [radicals, setRadicals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    nhostService.getRadicals().then((data) => {
      setRadicals(data);
      setLoading(false);
    });
  }, []);

  const groupedByStrokes = useMemo(() => {
    return radicals.reduce((acc, r) => {
      const s = r.strokes || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(r);
      return acc;
    }, {});
  }, [radicals]);

  const strokesOrder = Object.keys(groupedByStrokes)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 pt-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:text-indigo-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Layers className="text-indigo-500" />
            214 Bộ Thủ Kangxi
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            Nền tảng cấu tạo Hán tự giúp ghi nhớ Kanji dễ dàng hơn
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-black animate-pulse">ĐANG TẢI 214 BỘ THỦ...</p>
        </div>
      ) : radicals.length === 0 ? (
        <div className="text-center py-32 space-y-4 bg-white dark:bg-slate-800 rounded-[32px] border-2 border-slate-100 dark:border-slate-700 px-4">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-700 dark:text-white">Chưa có dữ liệu Bộ Thủ</h2>
          <p className="text-sm font-bold text-slate-400 max-w-sm mx-auto">
            Hệ thống hiện chưa có dữ liệu 214 bộ thủ Kangxi. Vui lòng thêm dữ liệu để tiếp tục.
          </p>
          <div className="mt-6 flex justify-center">
            <input
              type="file"
              accept=".json"
              id="import-radicals"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  setLoading(true);
                  const text = await file.text();
                  const data = JSON.parse(text);
                  
                  if (!Array.isArray(data)) {
                    throw new Error("File JSON phải là một mảng các bộ thủ.");
                  }
                  
                  // Map directly assuming the JSON aligns with Hasura schema
                  const objects = data.map((r, i) => ({
                    radical_number: r.radical_number || i + 1,
                    character: r.character || r.radical || r.word || "",
                    strokes: typeof r.strokes === 'number' ? r.strokes : (parseInt(r.strokes) || 1),
                    meaning_vi: r.meaning_vi || r.meaning || "",
                    name_vi: r.name_vi || r.han_viet || r.hanViet || "",
                  }));

                  // Generate UUIDs
                  for (let obj of objects) {
                     obj.id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                        var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
                        return v.toString(16);
                     });
                  }

                  const res = await nhostService.bulkInsertRadicals(objects);
                  if (res.errors) {
                    alert("Lỗi khi thêm: " + res.errors[0].message);
                  } else {
                    alert(`Đã thêm thành công ${res.data.insert_radicals.affected_rows} bộ thủ!`);
                    // Refresh data
                    const newData = await nhostService.getRadicals();
                    setRadicals(newData);
                  }
                } catch (err) {
                  alert("Lỗi đọc file: " + err.message);
                } finally {
                  setLoading(false);
                }
              }}
            />
            <label
              htmlFor="import-radicals"
              className="mt-4 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <Upload size={18} />
              Nhập từ JSON (214 Bộ Thủ)
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {strokesOrder.map((strokeCount) => (
            <div key={strokeCount} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                  {strokeCount}
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">
                  {strokeCount} Nét
                </h2>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {groupedByStrokes[strokeCount].map((k, idx) => (
                  <motion.div
                    key={k.radical_number || idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20px" }}
                    className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all group flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div className="absolute top-2 left-3 text-[10px] font-black text-slate-300 dark:text-slate-600">
                      #{k.radical_number}
                    </div>
                    <div className="text-5xl font-black text-slate-800 dark:text-white mb-2 mt-2 group-hover:text-indigo-500 transition-colors group-hover:scale-110 duration-300">
                      {k.character}
                    </div>
                    <div className="w-full space-y-1 mt-2">
                      <p className="font-black text-indigo-500 text-sm uppercase tracking-wider">{k.name_vi}</p>
                      <p className="text-[10px] font-bold text-slate-500 line-clamp-2 leading-relaxed h-8">{k.meaning_vi}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
