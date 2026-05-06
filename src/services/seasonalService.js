import { getSimpleLunarDate, fetchLunarDate } from '../utils/lunarCalendar';

export const SEASONAL_EVENTS = {
  // Vietnamese Holidays
  HUNG_KINGS: {
    id: 'hung_kings',
    name: 'Giỗ Tổ Hùng Vương',
    keywords: ['hung kings', 'gio to'],
    icon: '🏮',
    color: '#d32f2f', // Red
    greeting: 'Dù ai đi ngược về xuôi, nhớ ngày Giỗ Tổ mùng mười tháng ba',
    decoration: '🇻🇳',
    effect: 'flag' // Flying flags
  },
  CPV_DAY: {
    id: 'cpv_day',
    name: 'Thành lập Đảng',
    keywords: ['3/2'],
    icon: '🚩',
    color: '#d32f2f', // Red
    greeting: 'Kỷ niệm Ngày thành lập Đảng Cộng sản Việt Nam 3/2',
    decoration: '🇻🇳',
    effect: 'flag'
  },
  REUNIFICATION: {
    id: 'reunification',
    name: 'Giải phóng miền Nam',
    keywords: ['30/4', 'liberation'],
    icon: '⭐',
    color: '#d32f2f', // Red
    greeting: 'Mừng ngày Giải phóng miền Nam thống nhất đất nước (30/4/1975)!',
    decoration: '🇻🇳',
    effect: 'fireworks'
  },
  LABOR_DAY: {
    id: 'labor_day',
    name: 'Quốc tế Lao động',
    keywords: ['1/5', 'labor'],
    icon: '🛠️',
    color: '#1976d2', // Blue
    greeting: 'Mừng ngày Quốc tế Lao động 1/5!',
    decoration: '👷',
    effect: 'none'
  },
  NATIONAL_DAY: {
    id: 'national_day',
    name: 'Quốc khánh',
    keywords: ['2/9', 'national day'],
    icon: '⭐',
    color: '#d32f2f', // Red
    greeting: 'Mừng Quốc khánh nước CHXHCN Việt Nam 2/9!',
    decoration: '🇻🇳',
    effect: 'flag'
  },
  
  WOMENS_DAY_VN: {
    id: 'womens_day_vn',
    name: 'Phụ nữ Việt Nam',
    keywords: ['20/10'],
    icon: '🌹',
    color: '#ec4899',
    greeting: 'Chúc mừng ngày Phụ nữ Việt Nam 20/10!',
    decoration: '💃',
    effect: 'hearts'
  },
  TEACHERS_DAY: {
    id: 'teachers_day',
    name: 'Nhà giáo Việt Nam',
    keywords: ['20/11'],
    icon: '👨‍🏫',
    color: '#0d9488',
    greeting: 'Chúc mừng ngày Nhà giáo Việt Nam 20/11!',
    decoration: '📝',
    effect: 'confetti'
  },
  WOMENS_DAY_INTL: {
    id: 'womens_day_intl',
    name: 'Quốc tế Phụ nữ',
    keywords: ['8/3', 'women'],
    icon: '💐',
    color: '#f472b6',
    greeting: 'Chúc mừng ngày Quốc tế Phụ nữ 8/3!',
    decoration: '💝',
    effect: 'hearts'
  },
  CHILDRENS_DAY: {
    id: 'childrens_day',
    name: 'Quốc tế Thiếu nhi',
    keywords: ['1/6', 'children'],
    icon: '🎈',
    color: '#fbbf24',
    greeting: 'Chúc mừng ngày Quốc tế Thiếu nhi 1/6!',
    decoration: '🧸',
    effect: 'confetti'
  },
  COLD_FOOD_FESTIVAL: {
    id: 'cold_food',
    name: 'Tết Hàn Thực',
    keywords: ['banh troi', 'cold food'],
    icon: '🥣',
    color: '#94a3b8',
    greeting: 'Tết Hàn Thực - Thưởng thức bánh trôi, bánh chay',
    decoration: '🥟',
    effect: 'none'
  },
  DRAGON_BOAT: {
    id: 'dragon_boat',
    name: 'Tết Đoan Ngọ',
    keywords: ['doan ngo', 'dragon boat'],
    icon: '🐉',
    color: '#059669',
    greeting: 'Tết Đoan Ngọ - Diệt sâu bọ!',
    decoration: '🍶',
    effect: 'none'
  },
  TET: {
    id: 'tet',
    name: 'Tết Nguyên Đán',
    keywords: ['tet', 'lunar new year'],
    icon: '🌸', // Peach blossom
    color: '#d32f2f', // Red
    greeting: 'Chúc Mừng Năm Mới!',
    decoration: '🧧',
    effect: 'apricot_peach' // Mixed yellow (apricot) and pink (peach)
  },
  VALENTINE: {
    id: 'valentine',
    name: 'Valentine',
    keywords: ['valentine'],
    icon: '💝',
    color: '#e91e63',
    greeting: 'Happy Valentine\'s Day!',
    decoration: '🌹',
    effect: 'hearts'
  },
  SPRING: {
    id: 'spring',
    name: 'Mùa Xuân',
    icon: '🌱',
    color: '#4caf50',
    greeting: 'Mùa xuân ấm áp! - cung hỉ phát tài', 
    decoration: '🦋',
    effect: 'sakura' // Peach blossoms falling
  },
  SUMMER: {
    id: 'summer',
    name: 'Mùa Hè',
    icon: '☀️',
    color: '#ff9800',
    greeting: 'Mùa hè năng động!',
    decoration: '🌻',
    effect: 'sunshine'
  },
  AUTUMN: {
    id: 'autumn',
    name: 'Mùa Thu',
    icon: '🍁',
    color: '#ff5722',
    greeting: 'Mùa thu lãng mạn!',
    decoration: '🍂',
    effect: 'leaves'
  },
  HALLOWEEN: {
    id: 'halloween',
    name: 'Halloween',
    keywords: ['halloween'],
    icon: '🎃',
    color: '#ff6d00',
    greeting: 'Happy Halloween!',
    decoration: '👻',
    effect: 'ghosts'
  },
  WINTER: {
    id: 'winter',
    name: 'Mùa Đông',
    icon: '❄️',
    color: '#03a9f4',
    greeting: 'Mùa đông không lạnh!',
    decoration: '⛄',
    effect: 'snow'
  },
  CHRISTMAS: {
    id: 'christmas',
    name: 'Giáng Sinh',
    keywords: ['christmas', 'noel'],
    icon: '🎄',
    color: '#1b5e20',
    greeting: 'Merry Christmas!',
    decoration: '🔔',
    effect: 'snow'
  },
  NEW_YEAR: {
    id: 'new_year',
    name: 'Năm Mới',
    keywords: ['new year'],
    icon: '🎆',
    color: '#ffc107',
    greeting: 'Happy New Year!',
    decoration: '🥂',
    effect: 'confetti'
  },
  DEFAULT: {
    id: 'default',
    name: 'Ngày thường',
    icon: '✨',
    color: '#58CC02',
    greeting: 'Chào bạn, hôm nay thế nào?',
    decoration: '🌟',
    effect: 'none'
  },
  // Lunar Calendar Events
  MID_AUTUMN: {
    id: 'mid_autumn',
    name: 'Tết Trung Thu',
    keywords: ['trung thu', 'mid autumn'],
    icon: '🏮',
    color: '#ffc107',
    greeting: 'Chúc mừng Tết Trung Thu!',
    decoration: '🥮',
    effect: 'confetti'
  },
  WANDERING_SOULS: {
    id: 'wandering_souls',
    name: 'Vu Lan',
    keywords: ['vu lan', 'wandering souls'],
    icon: '🙏',
    color: '#9c27b0',
    greeting: 'Ngày Vu Lan báo hiếu',
    decoration: '🌸',
    effect: 'sakura'
  },
  KITCHEN_GODS: {
    id: 'kitchen_gods',
    name: 'Ông Táo chầu trời',
    keywords: ['ong tao', 'kitchen gods'],
    icon: '🐟',
    color: '#ff5722',
    greeting: 'Ông Táo chầu trời - Chuẩn bị đón Tết!',
    decoration: '🎏',
    effect: 'none'
  }
};

export const MOTIVATIONAL_QUOTES = [
  { ja: "[自](じ)[分](ぶん)を[信](しん)じろ", en: "Believe in yourself.", vi: "Hãy tin vào chính mình." },
  { ja: "[不](ふ)[撓](とう)[不](ふ)[屈](くつ)", en: "Indomitable, untiring, unyielding.", vi: "Bất khuất, không chùn bước." },
  { ja: "[一](いっ)[生](しょう)[懸](けん)[命](めい)", en: "With utmost effort.", vi: "Cố gắng hết sức mình." },
  { ja: "[夢](ゆめ)は[逃](に)げない。[逃](に)げるのはいつも[自](じ)[分](ぶん)だ。", en: "Dreams don't run away. It's always you who runs away.", vi: "Ước mơ không bao giờ rời bỏ bạn, chỉ có bạn rời bỏ ước mơ thôi." },
  { ja: "[克](こく)[己](き)[心](しん)", en: "Self-control, the spirit of overcoming one's own desires.", vi: "Vượt qua chính mình." },
  { ja: "[切](せ) [磋](さ) [琢](たく) [磨](ま)", en: "Cultivating one's character by studying hard.", vi: "Mài dũa bản thân, học hỏi lẫn nhau." },
  { ja: "[臥](が)[薪](しん)[嘗](しょう)[胆](たん)", en: "Going through hardships for the sake of future success.", vi: "Nếm mật nằm gai." },
  { ja: "[有](う)[言](ごん)[実](じっ)[行](こう)", en: "Actions speak louder than words / Doing what you say.", vi: "Nói được làm được." },
  { ja: "[無](む)[我](が)[夢](む)[中](ちゅう)", en: "Being completely absorbed in something.", vi: "Say mê quên mình." },
  { ja: "[日](にち)[進](しん)[月](げっ)[歩](ぽ)", en: "Steady and rapid progress.", vi: "Tiến bộ vượt bậc mỗi ngày." },
  { ja: "[心](しん)[機](き)[一](いっ)[轉](てん)", en: "Turning over a new leaf.", vi: "Thay đổi tâm thế, bắt đầu mới." },
  { ja: "[誠](せい)[実](じつ)は[一](いっ)[生](しょう)の[宝](たから)", en: "Honesty is a lifelong treasure.", vi: "Lòng thành thực là kho báu cả đời." },
  { ja: "[良](い)い[物](もの)は[小](ちい)さい[包](つつ)みで[来](く)る", en: "Good things come in small packages.", vi: "Nhỏ mà có võ." },
  { ja: "[道](みち)は[開](ひら)ける", en: "A path will open up.", vi: "Đường sẽ mở dưới chân bạn." },
  { ja: "[一](いっ)[寸](すん)[先](さき)は[闇](やみ)", en: "The future is unpredictable.", vi: "Tương lai là một ẩn số." },
  { ja: "[窮](きゅう)[鼠](そ) [猫](ねこ)を[噛](か)む", en: "A cornered rat bites the cat.", vi: "Con giun xéo lắm cũng quằn." },
  { ja: "[思](おも)い[立](た)ったが[吉](きち)[日](じつ)", en: "The best day to start is the day you decide to do it.", vi: "Ngày tốt nhất là ngày ta bắt đầu." },
  { ja: "[青](あお)は[藍](あい)より[出](い)でて[藍](あい)より[青](あお)し", en: "The student will surpass the master.", vi: "Hậu sinh khả úy." },
  { ja: "[案](あん)ずるより[産](う)むが[易](やす)し", en: "It’s easier to do it than to worry about it.", vi: "Làm rồi mới thấy không khó như mình nghĩ." },
  { ja: "[渡](わた)る[世](せ)[間](けん)に[鬼](おに)はなし", en: "There is kindness to be found everywhere.", vi: "Thế gian này vẫn còn nhiều người tốt." },
  { ja: "[千](せん)[里](り)の[道](みち)も[一](いっ)[歩](ぽ)から", en: "Nghìn dặm bắt đầu từ một bước chân.", vi: "Nghìn dặm bắt đầu từ một bước chân." },
  { ja: "[七](なな)[転](ころ)び[八](や)[起](お)き", en: "Fall seven times, stand up eight.", vi: "Thất bại là mẹ thành công." },
  { ja: "[継](けい)[続](ぞく)は[力](ちから)なり", en: "Continuity is power.", vi: "Kiên trì là sức mạnh." },
  { ja: "[一](いち)[期](ご)[一](いち)[会](え)", en: "Treasure every meeting, for it will never recur.", vi: "Trân trọng từng khoảnh khắc." },
  { ja: "[塵](ちり)も[積](つ)もれば[山](やま)となる", en: "Even dust, if piled up, becomes a mountain.", vi: "Tích tiểu thành đại." },
  { ja: "[失](しっ)[敗](ぱい)は[成](せい)[功](こう)のもと", en: "Failure is the stepping stone to success.", vi: "Thất bại là mẹ thành công." },
  { ja: "[猿](さる)も[木](き)から[落](お)ちる", en: "Even monkeys fall from trees.", vi: "Ai cũng có lúc sai sót." },
  { ja: "[千](せん)[里](り)の[道](みち)も[一](いっ)[歩](ぽ)から", en: "A journey of a thousand miles begins with a single step.", vi: "Vạn dặm bắt đầu từ một bước chân." },
  { ja: "[花](か)[鳥](ちょう)[風](ふう)[月](げつ)", en: "Experience the beauties of nature.", vi: "Thưởng thức vẻ đẹp thiên nhiên." },
  { ja: "[以](い)[心](しん)[伝](でん)[心](しん)", en: "Heart to heart communication.", vi: "Thần giao cách cảm." },
  { ja: "[雨](あめ)[降](ふ)って[地](じ)[固](かた)まる", en: "After the rain, the ground hardens.", vi: "Sau cơn mưa trời lại sáng." },
  { ja: "[虎](こ)[穴](けつ)に[入](い)らずんば[虎](こ)[子](じ)を[得](え)ず", en: "No pain, no gain.", vi: "Không vào hang cọp sao bắt được cọp con." },
  { ja: "[明](あ)[日](した)は[明](あ)[日](した)の[風](かぜ)が[吹](ふ)く", en: "Tomorrow is another day.", vi: "Ngày mai trời lại sáng." },
  { ja: "[能](のう)ある[鷹](たか)は[爪](つめ)を[隠](かく)す", en: "A wise falcon hides its talons.", vi: "Tài năng thực sự không cần phô trương." },
  { ja: "[十](じゅう)[人](にん)[十](と)[色](いろ)", en: "Ten people, ten colors.", vi: "Mỗi người một vẻ." },
  { ja: "[初](しょ)[心](しん)[忘](わす)るべからず", en: "Don't forget your original intention.", vi: "Đừng quên sơ tâm." },
  { ja: "[笑](わら)う[門](かど)には[福](ふく)[来](き)たる", en: "Good fortune comes to a merry home.", vi: "Một nụ cười bằng mười thang thuốc bổ." },
  { ja: "[一](いっ)[石](せき)[二](に)[鳥](ちょう)", en: "Kill two birds with one stone.", vi: "Một mũi tên trúng hai đích." },
  { ja: "[自](じ)[業](ごう)[自](じ)[得](とく)", en: "You reap what you sow.", vi: "Gieo nhân nào gặt quả nấy." },
  { ja: "[知](し)らぬが[仏](ほとけ)", en: "Ignorance is bliss.", vi: "Không biết thì không phiền não." },
  { ja: "[時](とき)は[金](かね)なり", en: "Time is money.", vi: "Thời gian là vàng bạc." },
  { ja: "[急](いそ)がば[回](まわ)れ", en: "Haste makes waste.", vi: "Dục tốc bất đạt." },
  { ja: "[案](あん)ずるより[産](う)むが[易](やす)し", en: "Attempt is easier than anxiety.", vi: "Mọi việc khi làm rồi mới thấy dễ hơn là ngồi lo lắng." },
  { ja: "[井](い)の[中](なか)の[蛙](かわず)[大](たい)[海](かい)を[知](し)らず", en: "A frog in a well knows nothing of the great ocean.", vi: "Ếch ngồi đáy giếng." },
  { ja: "[石](いし)の[上](うえ)にも[三](さん)[年](ねん)", en: "Three years on a stone.", vi: "Có công mài sắt có ngày nên kim." },
  { ja: "[聞](き)くは[一](いっ)[時](じ)の[恥](はじ)、[聞](き)かぬは[一](いっ)[生](しょう)の[恥](はじ)", en: "To ask is a moment's shame, not to ask is a lifelong shame.", vi: "Muốn biết phải hỏi, muốn giỏi phải học." },
  { ja: "[類](るい)は[友](とも)を[呼](よ)ぶ", en: "Birds of a feather flock together.", vi: "Ngưu tầm ngưu, mã tầm mã." },
  { ja: "[出](で)る[杭](くい)は[打](う)たれる", en: "The stake that sticks out gets hammered down.", vi: "Khác biệt thường bị soi mói." },
  { ja: "[悪](あく)[銭](せん)[身](み)につかず", en: "Ill-gotten gains never last.", vi: "Của thiên trả địa." },
  { ja: "[口](くち)は[災](わざわ)いのもと", en: "The mouth is the source of disaster.", vi: "Họa từ miệng mà ra." },
  { ja: "[終](お)わりよければすべてよし", en: "All's well that ends well.", vi: "Kết thúc tốt đẹp là tất cả đều tốt." },
  { ja: "[住](す)めば[都](みやこ)", en: "Wherever you live can become home.", vi: "Sống đâu quen đó." },
  { ja: "[旅](たび)の[恥](はじ)はかき[捨](す)て", en: "Shame thrown away on a journey.", vi: "Đi xa thì không sợ mất mặt." },
  { ja: "[二](に)[兎](と)を[追](お)う[者](もの)は[一](いっ)[兎](と)をも[得](え)ず", en: "He who chases two rabbits catches neither.", vi: "Bắt cá hai tay tuột ngay cả hai." },
  { ja: "[良](りょう)[薬](やく)[口](くち)に[苦](にが)し", en: "Good medicine tastes bitter.", vi: "Thuốc đắng dã tật." },
  { ja: "[温](おん)[故](こ)[知](ち)[新](しん)", en: "Learn the old, understand the new.", vi: "Ôn cố tri tân." },
  { ja: "[百](ひゃく)[聞](ぶん)は[一](いっ)[見](けん)に[如](し)かず", en: "Seeing once is better than hearing a hundred times.", vi: "Trăm nghe không bằng một thấy." },
  { ja: "[人](ひと)の[振](ふ)り[見](み)て[我](わ)が[振](ふ)り[直](なお)せ", en: "Learn from others' mistakes.", vi: "Học từ sai lầm của người khác." },
  { ja: "[転](ころ)ばぬ[先](さき)の[杖](つえ)", en: "A walking stick before you stumble.", vi: "Phòng bệnh hơn chữa bệnh." },
  { ja: "[三](さん)[人](にん)[寄](よ)れば[文](もん)[殊](じゅ)の[知](ち)[恵](え)", en: "Three heads are better than one.", vi: "Ba người một trí, việc gì cũng thành." },
  { ja: "[後](あと)の[祭](まつ)り", en: "After the festival (too late).", vi: "Đã muộn rồi." },
  { ja: "[馬](うま)の[耳](みみ)に[念](ねん)[仏](ぶつ)", en: "Buddha's teachings to a horse's ear.", vi: "Nói với người không hiểu." },
  { ja: "[花](はな)より[団](だん)[子](ご)", en: "Dumplings over flowers (substance over style).", vi: "Thực chất hơn hình thức." },
  { ja: "[蛙](かえる)の[子](こ)は[蛙](かえる)", en: "A frog's child is a frog.", vi: "Con nhà tông không giống lông cũng giống cánh." },
  { ja: "[光](ひかり)[陰](いん)[矢](や)の[如](ごと)し", en: "Time flies like an arrow.", vi: "Thời gian trôi nhanh như tên bay." },
  { ja: "[袖](そで)[振](ふ)り[合](あ)うも[他](た)[生](しょう)の[縁](えん)", en: "Even a chance meeting is preordained.", vi: "Duyên phận tiền định." },
  { ja: "[覆](ふく)[水](すい)[盆](ぼん)に[返](かえ)らず", en: "Spilled water won't return to the tray.", vi: "Nước đổ đi không hốt lại được." },
  { ja: "[喉](のど)[元](もと)[過](す)ぎれば[熱](あつ)さを[忘](わす)れる", en: "Once it passes the throat, you forget the heat.", vi: "Qua cơn đau quên thuốc đắng." },
  { ja: "[鬼](おに)に[金](かな)[棒](ぼう)", en: "An iron club for a demon (making strong even stronger).", vi: "Như hổ mọc thêm cánh." },
  { ja: "[猫](ねこ)に[小](こ)[判](ばん)", en: "Gold coins to a cat (wasted on someone).", vi: "Như đàn gảy tai trâu." },
  { ja: "[犬](いぬ)も[歩](ある)けば[棒](ぼう)に[当](あ)たる", en: "Even a dog will find a stick if it walks.", vi: "Có công mài sắt có ngày nên kim." },
  { ja: "[寝](ね)る[子](こ)は[育](そだ)つ", en: "A sleeping child grows.", vi: "Ngủ nhiều lớn nhanh." },
  { ja: "[郷](ごう)に[入](い)っては[郷](ごう)に[従](したが)え", en: "When in Rome, do as the Romans do.", vi: "Nhập gia tùy tục." },
  { ja: "[千](せん)[里](り)の[道](みち)も[一](いっ)[歩](ぽ)から", en: "A thousand-mile journey begins with a single step.", vi: "Nghìn dặm bắt đầu từ một bước chân." },
  { ja: "[苦](く)[労](ろう)は[買](か)ってでもせよ", en: "Welcome hardships; jump at any chance for training.", vi: "Khổ trước sướng sau." },
  { ja: "[言](げん)[行](こう)[一](いっ)[致](ち)", en: "Consistency of words and actions.", vi: "Nói đi đôi với làm." },
  { ja: "[一](いっ)[意](い)[専](せん)[心](しん)", en: "Wholehearted devotion.", vi: "Toàn tâm toàn ý." },
  { ja: "[風](ふう)[林](りん)[火](か)[山](ざん)", en: "As swift as the wind, as quiet as the forest, as daring as fire, and as immovable as the mountain.", vi: "Nhanh như phong, tĩnh như lâm, hỏa như xâm, bất động như sơn." },
  { ja: "[不](ふ)[言](げん)[実](じっ)[行](こう)", en: "Action without words.", vi: "Làm mà không cần nói." },
  { ja: "[花](はな)は[桜](さくら)[木](ぎ)、[人](ひと)は[武](ぶ)[士](し)", en: "As the cherry blossom is first among flowers, so the warrior is first among men.", vi: "Hoa anh đào đẹp nhất, võ sĩ đạo chí khí nhất." },
  { ja: "[雨](あめ)の[後](あと)에는[虹](にじ)が[出](で)る", en: "After the rain, comes a rainbow.", vi: "Sau cơn mưa trời lại sáng." },
  { ja: "[明](あ)けない[夜](よ)はない", en: "There is no night that does not end in dawn.", vi: "Không có đêm nào là không kết thúc." },
  { ja: "[百](ひゃく)[折](せつ)[不](ふ)[撓](とう)", en: "Indomitable perseverance.", vi: "Trăm lần gãy không sờn lòng." },
  { ja: "[磨](みが)けば[光](ひか)る", en: "If you polish it, it will shine.", vi: "Càng mài dũa càng tỏa sáng." },
  { ja: "[心](しん)[配](ぱい)ない、なんとかなる", en: "Don't worry, it will all work out.", vi: "Đừng lo lắng, mọi chuyện rồi sẽ ổn thôi." },
  { ja: "[今](いま)を[戦](たたか)えない者に、[次](つぎ)はない。", en: "There is no 'next time' for those who cannot fight now.", vi: "Kẻ không chiến đấu cho hiện tại, sẽ không có tương lai." },
  { ja: "[諦](あきら)めたらそこで[試](し)[合](あい)[終](しゅう)[火](りょう)ですよ。", en: "If you give up, the game is over right then and there.", vi: "Nếu bỏ cuộc, cuộc chơi sẽ kết thúc ngay tại đó." },
  { ja: "[生](い)きているだけで[丸](まる)[儲](もう)け", en: "Just being alive is a profit.", vi: "Chỉ cần còn sống là còn hy vọng." },
  { ja: "[雲](くも)の[上](うえ)はいつも[晴](は)れ", en: "Above the clouds, it's always sunny.", vi: "Trên tầng mây, trời luôn hửng nắng." },
  { ja: "[勝](か)って[兜](かぶと)の[緒](お)を[締](し)めよ", en: "Tighten your helmet strings after a victory.", vi: "Thắng không kiêu, bại không nản." },
  { ja: "[一](いち)[日](にち)[一](いっ)[歩](ぽ)", en: "One step a day.", vi: "Mỗi ngày một bước tiến." },
  { ja: "[積](つ)み[重](かさ)ねが、[自](じ)[信](しん)になる。", en: "Accumulation leads to confidence.", vi: "Sự tích lũy tạo nên sự tự tin." },
  { ja: "[願](ねが)えば[叶](かな)う", en: "Wishes come true.", vi: "Cầu được ước thấy." },
  { ja: "[考](かんが)えるな、[感](かん)じろ", en: "Don't think, feel.", vi: "Đừng nghĩ, hãy cảm nhận." },
  { ja: "[百](ひゃく)[戦](せん)[錬](れん)[磨](ま)", en: "Tested by a hundred battles.", vi: "Trăm trận thành thép." },
  { ja: "[試](し)[行](こう)[錯](さ)[誤](ご)", en: "Trial and error.", vi: "Phép thử và sai." },
  { ja: "[自](じ)[分](ぶん)らしく[生](い)きる", en: "Live as yourself.", vi: "Sống là chính mình." },
  { ja: "[努](ど)[力](りょく)は[嘘](うそ)をつかない", en: "Effort never lies.", vi: "Nỗ lực không bao giờ phản bội bạn." },
  { ja: "[前](ぜん)[途](と)[洋](よう)[々](よう)", en: "A bright future lies ahead.", vi: "Tiền đồ rộng mở." },
  { ja: "[破](は)[竹](ちく)の[勢](いきお)い", en: "With irresistible force.", vi: "Thế chẻ tre." },
  { ja: "[一](いっ)[致](ち)[団](だん)[結](けつ)", en: "Unite as one.", vi: "Đoàn kết là sức mạnh." },
  { ja: "[才](さい)[色](しょく)[兼](けん)[備](び)", en: "A woman gifted with both brains and beauty.", vi: "Tài sắc vẹn toàn." },
  { ja: "[外](がい)[柔](じゅう)[内](ない)[剛](ごう)", en: "Soft on the outside, strong on the inside.", vi: "Ngoài nhu trong cương." },
  { ja: "[勇](ゆう)[猛](もう)[果](か)[敢](かん)", en: "Daring and resolute.", vi: "Dũng mãnh quả cảm." },
  { ja: "[深](しん)[謀](ぼう)[遠](えん)[慮](りょ)", en: "Thinking with great foresight.", vi: "Mưu sâu kế xa." },
  { ja: "[克](こく)[己](き)[復](ふく)[礼](れい)", en: "Self-control and return to propriety.", vi: "Khắc kỷ phục lễ." }
];

export function getSeasonalEvent() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const date = now.getDate();
  const year = now.getFullYear();

  let event = SEASONAL_EVENTS.DEFAULT;

  // 1. Check Lunar Date for Tet (Priority) - Synchronous fallback
  // Note: This is a fallback. The accurate check is done via checkLunarEvents() in App.jsx
  const lunar = getSimpleLunarDate(now);
  if (lunar && lunar.month === 1 && lunar.day >= 1 && lunar.day <= 5) {
      event = { ...SEASONAL_EVENTS.TET };
      const mung = ['Mùng 1', 'Mùng 2', 'Mùng 3', 'Mùng 4', 'Mùng 5'][lunar.day - 1];
      
      const currentHour = now.getHours();
      if (lunar.day === 1 && currentHour === 0) {
          event.effect = 'fireworks';
          event.greeting = `🎆 Chúc Mừng Năm Mới ${year} - Giao Thừa Thiêng Liêng! 🎆`;
      } else {
          event.greeting = `Chúc Mừng Năm Mới! Nay là ${mung} Tết ${year}`;
      }
      return event;
  }

  // 2. Check Calendar Holidays (Solar calendar - exact dates)
  if (month === 1 && date === 1) {
    event = { ...SEASONAL_EVENTS.NEW_YEAR, greeting: `Happy New Year ${year}!` };
  }
  else if (month === 2 && date === 3) {
    event = SEASONAL_EVENTS.CPV_DAY;
  }
  else if (month === 2 && date === 14) {
    event = SEASONAL_EVENTS.VALENTINE;
  }
  else if (month === 3 && date === 8) {
    event = SEASONAL_EVENTS.WOMENS_DAY_INTL;
  }
  else if (month === 4 && date === 30) {
    event = SEASONAL_EVENTS.REUNIFICATION;
  }
  else if (month === 5 && date === 1) {
    event = SEASONAL_EVENTS.LABOR_DAY;
  }
  else if (month === 6 && date === 1) {
    event = SEASONAL_EVENTS.CHILDRENS_DAY;
  }
  else if (month === 9 && date === 2) {
    event = SEASONAL_EVENTS.NATIONAL_DAY;
  }
  else if (month === 10 && date === 20) {
    event = SEASONAL_EVENTS.WOMENS_DAY_VN;
  }
  else if (month === 10 && date === 31) {
    event = SEASONAL_EVENTS.HALLOWEEN;
  }
  else if (month === 11 && date === 20) {
    event = SEASONAL_EVENTS.TEACHERS_DAY;
  }
  else if (month === 12 && (date === 24 || date === 25)) {
    event = SEASONAL_EVENTS.CHRISTMAS;
  }
  // 3. Fall back to seasons (no lunar holidays checked here - they're handled by checkLunarEvents)
  else {
    // Vietnamese climate seasons
    if (month >= 2 && month <= 4) {
      event = SEASONAL_EVENTS.SPRING; // Feb-Apr: Spring
    }
    else if (month >= 5 && month <= 7) {
      event = SEASONAL_EVENTS.SUMMER; // May-Jul: Summer
    }
    else if (month >= 8 && month <= 10) {
      event = SEASONAL_EVENTS.AUTUMN; // Aug-Oct: Autumn
    }
    else {
      event = SEASONAL_EVENTS.WINTER; // Nov-Jan: Winter
    }
  }

  return event;
}

export async function checkLunarEvents() {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const lunarData = await fetchLunarDate(day, month, year);
    if (!lunarData) return null; // No change if API fails

    // Check Tet (Lunar 1/1 -> 1/5)
    if (lunarData.month === 1 && lunarData.day >= 1 && lunarData.day <= 5) {
         const event = { ...SEASONAL_EVENTS.TET };
         const mung = ['Mùng 1', 'Mùng 2', 'Mùng 3', 'Mùng 4', 'Mùng 5'][lunarData.day - 1];
         
         // Special logic for 12:00 AM (Midnight) on Mùng 1
         const currentHour = now.getHours();
         if (lunarData.day === 1 && currentHour === 0) {
            event.effect = 'fireworks';
            event.greeting = `🎆 Chúc Mừng Năm Mới ${year} - Giao Thừa Thiêng Liêng! 🎆`;
         } else {
            event.greeting = `Chúc Mừng Năm Mới! Nay là ${mung} Tết ${year}`;
         }
         return event;
    }

    // Check Cold Food Festival (Lunar 3/3)
    if (lunarData.month === 3 && lunarData.day === 3) {
        return SEASONAL_EVENTS.COLD_FOOD_FESTIVAL;
    }
    
    // Check Hung Kings Day (Lunar 10/3)
    if (lunarData.month === 3 && lunarData.day === 10) {
        return SEASONAL_EVENTS.HUNG_KINGS;
    }

    // Check Dragon Boat Festival (Lunar 5/5)
    if (lunarData.month === 5 && lunarData.day === 5) {
        return SEASONAL_EVENTS.DRAGON_BOAT;
    }

    // Check Wandering Souls Day / Vu Lan (Lunar 15/7)
    if (lunarData.month === 7 && lunarData.day === 15) {
        return SEASONAL_EVENTS.WANDERING_SOULS;
    }

    // Check Mid-Autumn Festival (Lunar 15/8)
    if (lunarData.month === 8 && lunarData.day === 15) {
        return SEASONAL_EVENTS.MID_AUTUMN;
    }

    // Check Kitchen Gods Day (Lunar 23/12)
    if (lunarData.month === 12 && lunarData.day === 23) {
        return SEASONAL_EVENTS.KITCHEN_GODS;
    }

    return null; // No special lunar event found
}

// Returns a Random Quote on every call (per user request)
export function getDailyQuote() {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
}
