import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Plus, AlertTriangle, GripVertical } from "lucide-react";

/**
 * Reusable CRUD Modal.
 *
 * Props:
 *  - open          : boolean
 *  - onClose       : () => void
 *  - mode          : "create" | "edit"
 *  - title         : string (modal title)
 *  - fields        : [{ key, label, type?, placeholder?, required?, options?[], rows?, subFields?[] }]
 *                      type "json-array" → subFields: [{ key, label, placeholder?, type? }]
 *  - initialData   : { key: value } (for edit mode)
 *  - onSave        : async (formData) => void
 *  - onDelete      : async () => void | null (only in edit mode)
 *  - saving        : boolean
 */

/* ── tiny helpers: parse anything into an array ── */
const toArray = val => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // ignore parse error
    }
  }
  return [];
};

const parseToArrayFlexible = val => {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  // JSON array
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
    } catch (e) {
      // ignore parse error
    }
  }
  // delimited
  if (s.includes("|"))
    return s
      .split("|")
      .map(x => x.trim())
      .filter(Boolean);
  if (s.includes(","))
    return s
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  return [s];
};

export const CrudModal = ({
  open,
  onClose,
  mode = "create",
  title = "",
  fields = [],
  initialData = {},
  onSave,
  onDelete,
  saving = false,
  headerAddon = null,
}) => {
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const init = {};
      fields.forEach(f => {
        if (f.type === "json-array") {
          // Parse JSON string / array into a real array
          init[f.key] = toArray(initialData[f.key]);
          // Guarantee at least one blank row when creating
          if (init[f.key].length === 0 && mode === "create") {
            const blank = {};
            (f.subFields || []).forEach(sf => (blank[sf.key] = ""));
            init[f.key] = [blank];
          }
        } else if (f.type === "json-groups") {
          let parsed = [];
          const tryParse = raw => {
            try {
              return JSON.parse(raw);
            } catch (e) {
              // try next fallback
            }
            try {
              return JSON.parse(raw.replace(/"([\u3000-\u9fff\uff00-\uffef]{1,4})"/g, "「$1」"));
            } catch (e) {
              // fallback failed
            }
            return null;
          };
          try {
            const v = initialData[f.key];
            if (Array.isArray(v)) {
              parsed = v;
            } else if (typeof v === "string" && v.trim()) {
              const p = tryParse(v);
              if (Array.isArray(p)) parsed = p;
            }
          } catch (e) {
            // ignore initial data parse error
          }
          init[f.key] =
            parsed.length > 0 ? parsed : [{ groupName: "", rules: [{ label: "", example: "" }] }];
        } else if (f.type === "json") {
          // If key is "_all", we provide the whole initialData as JSON
          const targetData = f.key === "_all" ? initialData : initialData[f.key];
          init[f.key] = targetData ? JSON.stringify(targetData, null, 2) : "";
        } else {
          init[f.key] = initialData[f.key] ?? "";
        }
      });
      const t = setTimeout(() => {
        setForm(init);
        setConfirmDelete(false);
        setError("");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open, initialData, fields]);

  // Tag helpers (add/remove for tag-type fields)
  const addTag = (fieldKey, tag) => {
    if (!tag || !tag.toString().trim()) return;
    setForm(prev => {
      const arr = [...(prev[fieldKey] || [])];
      if (!arr.includes(tag)) arr.push(tag);
      return { ...prev, [fieldKey]: arr };
    });
    if (error) setError("");
  };

  const removeTag = (fieldKey, idx) => {
    setForm(prev => {
      const arr = [...(prev[fieldKey] || [])];
      arr.splice(idx, 1);
      return { ...prev, [fieldKey]: arr };
    });
    if (error) setError("");
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  /* ── json-groups helpers (conjugation: [{groupName, rules:[{label,example}]}]) ── */
  const addGroup = fieldKey => {
    setForm(prev => ({
      ...prev,
      [fieldKey]: [
        ...(prev[fieldKey] || []),
        { groupName: "", rules: [{ label: "", example: "" }] },
      ],
    }));
  };
  const removeGroup = (fieldKey, gi) => {
    setForm(prev => {
      const arr = [...(prev[fieldKey] || [])];
      arr.splice(gi, 1);
      return { ...prev, [fieldKey]: arr };
    });
  };
  const handleGroupNameChange = (fieldKey, gi, value) => {
    setForm(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((g, i) => (i === gi ? { ...g, groupName: value } : g)),
    }));
  };
  const addRule = (fieldKey, gi) => {
    setForm(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((g, i) =>
        i === gi ? { ...g, rules: [...(g.rules || []), { label: "", example: "" }] } : g
      ),
    }));
  };
  const removeRule = (fieldKey, gi, ri) => {
    setForm(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((g, i) => {
        if (i !== gi) return g;
        const rules = [...(g.rules || [])];
        rules.splice(ri, 1);
        return { ...g, rules };
      }),
    }));
  };
  const handleRuleChange = (fieldKey, gi, ri, rkey, value) => {
    setForm(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((g, i) => {
        if (i !== gi) return g;
        return {
          ...g,
          rules: (g.rules || []).map((r, j) => (j === ri ? { ...r, [rkey]: value } : r)),
        };
      }),
    }));
  };

  /* ── json-array helpers ── */
  const handleArrayItemChange = (fieldKey, index, subKey, value) => {
    setForm(prev => {
      const arr = [...(prev[fieldKey] || [])];
      arr[index] = { ...arr[index], [subKey]: value };
      return { ...prev, [fieldKey]: arr };
    });
    if (error) setError("");
  };

  const addArrayItem = (fieldKey, subFields) => {
    setForm(prev => {
      const blank = {};
      (subFields || []).forEach(sf => (blank[sf.key] = ""));
      return { ...prev, [fieldKey]: [...(prev[fieldKey] || []), blank] };
    });
  };

  const removeArrayItem = (fieldKey, index) => {
    setForm(prev => {
      const arr = [...(prev[fieldKey] || [])];
      arr.splice(index, 1);
      return { ...prev, [fieldKey]: arr };
    });
  };

  const handleSave = async () => {
    // Validate required fields
    for (const f of fields) {
      if (f.type === "json-array") continue; // arrays validated separately if needed
      if (f.required && !form[f.key]?.toString().trim()) {
        setError(`Trường "${f.label}" không được để trống`);
        return;
      }
    }
    // Serialise json-array / json-groups fields to JSON strings before sending
    const out = { ...form };
    fields.forEach(f => {
      if (f.type === "json-array") {
        // Filter out completely-empty rows
        const cleaned = (out[f.key] || []).filter(row =>
          Object.values(row).some(v => v?.toString().trim())
        );
        out[f.key] = JSON.stringify(cleaned);
      } else if (f.type === "json-groups") {
        const cleaned = (out[f.key] || [])
          .map(g => ({
            ...g,
            rules: (g.rules || []).filter(r => r.label?.trim() || r.example?.trim()),
          }))
          .filter(g => g.groupName?.trim() || g.rules.length > 0);
        out[f.key] = JSON.stringify(cleaned);
      } else if (f.type === "json") {
        try {
          const parsed = JSON.parse(out[f.key]);
          if (f.key === "_all") {
            // Merge the parsed JSON into the root output object
            Object.assign(out, parsed);
            delete out._all;
          } else {
            out[f.key] = parsed;
          }
        } catch (e) {
          setError(`Lỗi định dạng JSON trong trường "${f.label}"`);
          return;
        }
      }
    });
    try {
      await onSave(out);
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await onDelete();
    } catch (e) {
      setError(e.message || "Không thể xoá");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-100 dark:border-slate-700 w-full max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    mode === "create" ? "bg-[#58CC02]" : "bg-[#1CB0F6]"
                  }`}
                >
                  {mode === "create" ? <Plus size={18} /> : <Save size={18} />}
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {headerAddon}

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {field.description && (
                    <p className="text-[9px] text-slate-400 mb-1.5 -mt-1 leading-relaxed">{field.description}</p>
                  )}

                  {/* ── json-groups: conjugation editor (groups → rules) ── */}
                  {field.type === "json-groups" ? (
                    <div className="space-y-3">
                      {(form[field.key] || []).map((grp, gi) => (
                        <div
                          key={gi}
                          className="bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[#1CB0F6] uppercase tracking-widest">
                              Nhóm {gi + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeGroup(field.key, gi)}
                              className="ml-auto text-slate-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                              title="Xoá nhóm"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={grp.groupName || ""}
                            onChange={e => handleGroupNameChange(field.key, gi, e.target.value)}
                            placeholder="Tên nhóm (VD: Nhóm I, Nhóm II...)"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#1CB0F6]/40 rounded-lg text-sm font-bold outline-none focus:border-[#1CB0F6] transition-all dark:text-white"
                          />
                          <div className="space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700 mt-2">
                            {(grp.rules || []).map((rule, ri) => (
                              <div
                                key={ri}
                                className="flex items-start gap-2 bg-white/60 dark:bg-slate-800/60 rounded-lg p-2"
                              >
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={rule.label || ""}
                                    onChange={e =>
                                      handleRuleChange(field.key, gi, ri, "label", e.target.value)
                                    }
                                    placeholder="Quy tắc (VD: Cột い → Cột え)"
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none focus:border-[#1CB0F6] transition-all dark:text-white"
                                  />
                                  <input
                                    type="text"
                                    value={rule.example || ""}
                                    onChange={e =>
                                      handleRuleChange(field.key, gi, ri, "example", e.target.value)
                                    }
                                    placeholder="Ví dụ (VD: いきます → いけば)"
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none focus:border-[#1CB0F6] transition-all dark:text-white dark:placeholder:text-slate-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeRule(field.key, gi, ri)}
                                  className="text-slate-300 hover:text-red-400 transition-colors p-1 mt-0.5"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addRule(field.key, gi)}
                              className="w-full py-1.5 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-400 hover:text-[#1CB0F6] hover:border-[#1CB0F6]/40 transition-all flex items-center justify-center gap-1"
                            >
                              <Plus size={11} /> Thêm quy tắc
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addGroup(field.key)}
                        className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 hover:text-[#1CB0F6] hover:border-[#1CB0F6]/40 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Thêm nhóm
                      </button>
                    </div>
                  ) : field.type === "json-array" ? (
                    <div className="space-y-3">
                      {(form[field.key] || []).map((row, idx) => (
                        <div
                          key={idx}
                          className="relative bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2 group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <GripVertical size={10} className="text-slate-300" />#{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeArrayItem(field.key, idx)}
                              className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                              title="Xoá mục này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {(field.subFields || []).map(sf => (
                            <div key={sf.key}>
                              <label className="text-[9px] font-bold text-slate-400 mb-0.5 block">
                                {sf.label}
                              </label>
                              {sf.type === "textarea" ? (
                                <textarea
                                  value={row[sf.key] || ""}
                                  onChange={e =>
                                    handleArrayItemChange(field.key, idx, sf.key, e.target.value)
                                  }
                                  placeholder={sf.placeholder || ""}
                                  rows={2}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:border-[#1CB0F6] transition-all resize-none dark:text-white dark:placeholder:text-slate-500"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={row[sf.key] || ""}
                                  onChange={e =>
                                    handleArrayItemChange(field.key, idx, sf.key, e.target.value)
                                  }
                                  placeholder={sf.placeholder || ""}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:border-[#1CB0F6] transition-all dark:text-white dark:placeholder:text-slate-500"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addArrayItem(field.key, field.subFields)}
                        className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 hover:text-[#58CC02] hover:border-[#58CC02]/40 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Thêm mục
                      </button>
                    </div>
                  ) : field.type === "select" ? (
                    <select
                      value={form[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-[#1CB0F6] transition-all dark:text-white"
                    >
                      <option value="">-- Chọn --</option>
                      {(field.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={form[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      rows={field.rows || 3}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-[#1CB0F6] transition-all resize-none dark:text-white dark:placeholder:text-slate-500"
                    />
                  ) : field.type === "json" ? (
                    <textarea
                      value={form[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      rows={field.rows || 10}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:border-[#1CB0F6] transition-all resize-none dark:text-white dark:placeholder:text-slate-500"
                    />
                  ) : field.type === "tags" ? (
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(form[field.key] || []).map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-full text-sm"
                          >
                            <span className="truncate max-w-xs">{t}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(field.key, idx)}
                              className="text-slate-400 hover:text-red-400 p-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                      <TagInput
                        fieldKey={field.key}
                        onAdd={tag => addTag(field.key, tag)}
                        placeholder={field.placeholder || ""}
                      />
                    </div>
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={form[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-[#1CB0F6] transition-all dark:text-white dark:placeholder:text-slate-500"
                    />
                  )}
                </div>
              ))}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                {mode === "edit" && onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      confirmDelete
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200/30"
                        : "text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    }`}
                  >
                    <Trash2 size={16} />
                    {confirmDelete ? "Xác nhận xoá?" : "Xoá"}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all shadow-lg ${
                    mode === "create"
                      ? "bg-[#58CC02] hover:bg-[#46A302] shadow-green-200/30"
                      : "bg-[#1CB0F6] hover:bg-[#1899D6] shadow-sky-200/30"
                  } disabled:opacity-50`}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : mode === "create" ? (
                    <Plus size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {mode === "create" ? "Tạo mới" : "Lưu"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Small TagInput helper component
const TagInput = ({ fieldKey, onAdd, placeholder }) => {
  const [val, setVal] = React.useState("");
  const inputRef = React.useRef(null);

  const submit = () => {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="px-3 py-2 bg-[#1CB0F6] text-white rounded-lg"
      >
        Add
      </button>
    </div>
  );
};
