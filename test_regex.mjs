// Test improved regex that only captures Kanji/Katakana as base (not hiragana)

const testStr = '若(わか)いうちに勉強(べんきょう)しておきなさい。';
const testStr2 = '有効期限(ゆうこうきげん)が切(き)れないうちに';
const testStr3 = '元気(げんき)なうちに海外旅行(かいがいりょこう)しようと思(おも)っています。';

// Improved: Base must end with a Kanji/Katakana character (not hiragana)
// Base: one or more characters that are NOT whitespace/parens, BUT the group must contain at least one CJK ideograph
// Simpler approach: match sequences ending with CJK followed by parens with kana
const rubyRegexStr = '(?:[\\u4E00-\\u9FAF\\u3400-\\u4DBF\\u30A0-\\u30FF])+[\\(（][\\u3040-\\u309F\\u30A0-\\u30FF]+[\\)）]';

const regex = new RegExp(`(～|~|${rubyRegexStr})`, 'gi');

console.log('=== Split tests (improved) ===');
console.log('Test1:', testStr.split(regex));
console.log('Test2:', testStr2.split(regex));
console.log('Test3:', testStr3.split(regex));

// fMatch test - should only capture kanji as base
const fMatchRegex = /^([\u4E00-\u9FAF\u3400-\u4DBF\u30A0-\u30FF]+)[\(（]([\u3040-\u309F\u30A0-\u30FF]+)[\)）]$/;
console.log('\nfMatch tests:');
console.log('若(わか):', '若(わか)'.match(fMatchRegex));
console.log('勉強(べんきょう):', '勉強(べんきょう)'.match(fMatchRegex));
console.log('有効期限(ゆうこうきげん):', '有効期限(ゆうこうきげん)'.match(fMatchRegex));
console.log('切(き):', '切(き)'.match(fMatchRegex));
console.log('思(おも):', '思(おも)'.match(fMatchRegex));

console.log('\nDone!');
