const fs = require('fs');

const filePath = 'src/pages/HomePage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Mojibake (Encoding)
const replacements = {
    'á»ª': 'Ừ', 'á»°': 'Ự', 'á» ': 'ề', 'áº·': 'ặ', 'áº£': 'ả', 'áº¿': 'ế', 'á»‡': 'ệ', 'á»…': 'ễ', 'á»ƒ': 'ể', 'á» ': 'ơ',
    'á»›': 'ớ', 'á» ': 'ờ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ', 'á»£': 'ợ', 'á»±': 'ự', 'á»©': 'ứ', 'á»«': 'ừ', 'á»­': 'ử', 'á»¯': 'ữ',
    'á»‹': 'ị', 'á» ': 'ọ', 'á» ': 'ỏ', 'á»§': 'ủ', 'Å©': 'ũ', 'á»¥': 'ụ', 'á» ': 'ồ', 'á»‘': 'ố', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ',
    'áº­': 'ậ', 'áº¥': 'ấ', 'áº§': 'ầ', 'áº©': 'ẩ', 'áº«': 'ẫ', 'áº¯': 'ắ', 'áº±': 'ằ', 'áº³': 'ẳ', 'áºµ': 'ẵ',
    'Ã ': 'à', 'Ã¡': 'á', 'Ã£': 'ã', 'áº¡': 'ạ', 'Ãª': 'ê', 'Ã­': 'í', 'Ã¬': 'ì', 'Ã´': 'ô', 'Ã²': 'ò', 'Ã³': 'ó', 'Ãµ': 'õ', 'Ã¹': 'ù', 'Ãº': 'ú', 'Ã¢': 'â', 'Ã¨': 'è', 'Ã©': 'é', 'áº¹': 'ẹ', 'áº½': 'ẽ', 'Ä‘': 'đ', 'Ä ': 'Đ', 'Äƒ': 'ă', 'Æ¡': 'ơ', 'Æ°': 'ư',
    'â€º': '›', 'â€”': '—', 'â€¢': '•', 'â€¦': '…',
    'há» c': 'học', 'đá» ': 'đề', 'bá» ': 'bỏ',
    'Tá»ª Vá»°NG': 'TỪ VỰNG'
};

for (const [old, newVal] of Object.entries(replacements)) {
    content = content.split(old).join(newVal);
}

// 2. Restore renderTreeContent and fix renderMoriTimeline
const brokenMori = /\s+return \(\s+<div\s+id={`mori-content-\${root\.id}`}/;
const restoredMori = `
  const renderTreeContent = (node, isRoot = false) => {
    const subfolders = node.subfolders || [];
    const decks = node.decks || [];

    if (subfolders.length === 0 && decks.length === 0) {
      return (
        <div className="p-10 text-center text-slate-400 font-bold text-sm">
          Danh mục này chưa có dữ liệu.
        </div>
      );
    }

    return (
      <div className={\`space-y-4 \${isRoot ? "p-6" : "pl-6 mt-4 border-l-2 border-slate-100 dark:border-slate-800"}\`}>
        {subfolders.map(sub => (
          <div key={sub.id} className="space-y-2">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-indigo-400" />
                <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                  {sub.title}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreateDeck(sub, node.title);
                  }}
                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 rounded-lg transition-colors"
                  title="Thêm bài học"
                 >
                   <Plus size={14} />
                 </button>
              </div>
            </div>
            {renderTreeContent(sub)}
          </div>
        ))}

        {decks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decks.map(deck => (
              <motion.div
                key={deck.id}
                whileHover={{ scale: 1.02, y: -2 }}
                onClick={() => navigate(\`/deck/\${deck.id}\`)}
                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    <Book size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {deck.title}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {deck.total_vocab || 0} Từ vựng
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMoriTimeline = (root, deck) => {
    const stage = deck.stages[activeMoriStage] || deck.stages[0];
    const stageFolder = root.subfolders?.find(f =>
      f.title.toLowerCase().includes(stage.title.toLowerCase())
    );

    return (
      <div
        id={\`mori-content-\${root.id}\`}`;

content = content.replace(brokenMori, restoredMori);

// 3. Fix Community filter using matchedIds
const communityFilter = /const filteredRoots = communityTree\.filter\(root => \{\s*const t = root\.title\.toUpperCase\(\);\s*\/\/ Chỉ lọc bỏ các danh mục đã được hiển thị ở các phần chuyên biệt \(Mori, Japanience\)\s*return !t\.includes\("MORI"\) && !t\.includes\("JAPAN"\) && !t\.includes\("ORIGINAL"\);\s*\}\);/;

const fixedCommunityFilter = `const filteredRoots = communityTree.filter(root => {
                    return !matchedIds.has(root.id);
                  });`;

content = content.replace(communityFilter, fixedCommunityFilter);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final fix applied successfully.');
