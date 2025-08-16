import type { QuizQuestion } from '../../../types';

// レベル1: ワインの基本（赤・白・ロゼ・スパークリング）
export const level01Questions: QuizQuestion[] = [
  {
    id: 'L01_001',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの主な原料は何ですか？',
    options: ['米', 'ブドウ', '麦', 'りんご'],
    correctAnswer: 1,
    explanation: 'ワインはブドウを発酵させて作られるアルコール飲料です。'
  },
  {
    id: 'L01_002',
    difficulty: 1,
    category: 'ワインの基本',
    question: '赤ワインの色はどこから来ますか？',
    options: ['着色料', 'ブドウの果肉', 'ブドウの皮', '樽'],
    correctAnswer: 2,
    explanation: '赤ワインの色は、黒ブドウの皮に含まれるアントシアニンという色素から来ます。'
  },
  {
    id: 'L01_003',
    difficulty: 1,
    category: 'ワインの基本',
    question: '白ワインは主にどのように作られますか？',
    options: ['白ブドウのみ使用', '皮を除いて発酵', '低温で発酵', '水を加える'],
    correctAnswer: 1,
    explanation: '白ワインは主に皮を早めに取り除いて果汁のみを発酵させて作ります。白ブドウでも黒ブドウでも作れます。'
  },
  {
    id: 'L01_004',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ロゼワインの一般的な製法は？',
    options: ['赤と白を混ぜる', '短時間の皮接触', 'ピンクのブドウ使用', '食紅を加える'],
    correctAnswer: 1,
    explanation: 'ロゼワインは黒ブドウを短時間だけ皮と接触させて、薄いピンク色を抽出して作ります。'
  },
  {
    id: 'L01_005',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'スパークリングワインの泡はどうやってできますか？',
    options: ['炭酸ガス注入', '二次発酵', '振って混ぜる', '化学反応'],
    correctAnswer: 1,
    explanation: 'スパークリングワインの泡は、瓶内やタンク内での二次発酵により自然に発生する炭酸ガスです。'
  },
  {
    id: 'L01_006',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインのアルコール度数は一般的に何％くらい？',
    options: ['3-5%', '8-10%', '12-15%', '20-25%'],
    correctAnswer: 2,
    explanation: 'ワインのアルコール度数は一般的に12-15%です。ビールより高く、ウイスキーより低い度数です。'
  },
  {
    id: 'L01_007',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインボトルの標準的な容量は？',
    options: ['500ml', '750ml', '1000ml', '1500ml'],
    correctAnswer: 1,
    explanation: 'ワインボトルの標準容量は750mlです。これは約グラス5杯分に相当します。'
  },
  {
    id: 'L01_008',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'コルクの原料は何ですか？',
    options: ['プラスチック', 'ゴム', 'コルク樫の樹皮', '竹'],
    correctAnswer: 2,
    explanation: 'ワインのコルクは、主にポルトガルやスペインで栽培されるコルク樫の樹皮から作られます。'
  },
  {
    id: 'L01_009',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「ヴィンテージ」とは何を指しますか？',
    options: ['ワインの種類', 'ブドウの収穫年', 'ワインの価格', '熟成期間'],
    correctAnswer: 1,
    explanation: 'ヴィンテージはブドウを収穫した年を指します。その年の気候がワインの品質に影響します。'
  },
  {
    id: 'L01_010',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインを横に寝かせて保管する理由は？',
    options: ['場所を節約', 'コルクを湿らせる', '熟成を早める', '見た目が良い'],
    correctAnswer: 1,
    explanation: 'コルクを湿らせて乾燥を防ぎ、空気の侵入を防ぐために横に寝かせて保管します。'
  },
  // 残り90問を追加予定
  {
    id: 'L01_011',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの適切な保管温度は？',
    options: ['0-5℃', '10-15℃', '20-25℃', '30℃以上'],
    correctAnswer: 1,
    explanation: 'ワインの理想的な保管温度は10-15℃です。温度が安定していることも重要です。'
  },
  {
    id: 'L01_012',
    difficulty: 1,
    category: 'ワインの基本',
    question: '赤ワインの適切な飲み頃温度は？',
    options: ['5-8℃', '10-12℃', '16-18℃', '25℃以上'],
    correctAnswer: 2,
    explanation: '赤ワインは16-18℃が適温です。冷やしすぎると渋みが強調され、温かすぎるとアルコールが際立ちます。'
  },
  {
    id: 'L01_013',
    difficulty: 1,
    category: 'ワインの基本',
    question: '白ワインの適切な飲み頃温度は？',
    options: ['0-3℃', '6-10℃', '15-18℃', '20℃以上'],
    correctAnswer: 1,
    explanation: '白ワインは6-10℃が適温です。よく冷やすことで爽やかな酸味が楽しめます。'
  },
  {
    id: 'L01_014',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'デキャンタージュの主な目的は？',
    options: ['見た目を良くする', '空気に触れさせる', '温度を下げる', 'アルコールを飛ばす'],
    correctAnswer: 1,
    explanation: 'デキャンタージュは酸素と接触させてワインを開かせ、香りや味わいを向上させます。'
  },
  {
    id: 'L01_015',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「ボディ」とは何を表しますか？',
    options: ['ワインの色', 'ワインの重さ・濃さ', 'ワインの甘さ', 'ワインの酸味'],
    correctAnswer: 1,
    explanation: 'ボディはワインの重さや濃厚さを表す言葉で、ライトボディ、ミディアムボディ、フルボディがあります。'
  },
  {
    id: 'L01_016',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'タンニンとは何ですか？',
    options: ['甘味成分', '渋み成分', '酸味成分', '香り成分'],
    correctAnswer: 1,
    explanation: 'タンニンはブドウの皮や種、茎に含まれる渋み成分で、赤ワインの骨格を形成します。'
  },
  {
    id: 'L01_017',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「ドライ」なワインとは？',
    options: ['アルコール度数が高い', '残糖が少ない', '渋みが強い', '酸味が強い'],
    correctAnswer: 1,
    explanation: 'ドライは辛口を意味し、残糖がほとんどないワインを指します。'
  },
  {
    id: 'L01_018',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワイングラスが膨らんでいる理由は？',
    options: ['持ちやすいから', '香りを集めるため', '量を多く見せるため', 'デザインのため'],
    correctAnswer: 1,
    explanation: 'グラスの膨らみ（ボウル）は香りを集め、スワリングしやすくするためです。'
  },
  {
    id: 'L01_019',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'スワリングの目的は？',
    options: ['温度を上げる', '香りを立たせる', '混ぜる', '格好良く見せる'],
    correctAnswer: 1,
    explanation: 'スワリングはワインを空気に触れさせ、香りを立たせるために行います。'
  },
  {
    id: 'L01_020',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'オーガニックワインとは？',
    options: ['添加物なし', '有機栽培ブドウ使用', '自然発酵', '無濾過'],
    correctAnswer: 1,
    explanation: 'オーガニックワインは、化学肥料や農薬を使わない有機栽培のブドウから作られます。'
  },
  {
    id: 'L01_021',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「酸味」の役割は？',
    options: ['味を悪くする', '保存性と爽やかさを与える', '色を濃くする', 'アルコール度数を上げる'],
    correctAnswer: 1,
    explanation: '酸味はワインの保存性を高め、爽やかさと骨格を与える重要な要素です。'
  },
  {
    id: 'L01_022',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「甘口」「辛口」は何で決まる？',
    options: ['アルコール度数', '残糖量', '酸味', 'タンニン'],
    correctAnswer: 1,
    explanation: '甘口・辛口は主に残糖量で決まります。残糖が少ないと辛口、多いと甘口になります。'
  },
  {
    id: 'L01_023',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'シャンパーニュはどこで作られるワイン？',
    options: ['イタリア', 'スペイン', 'フランス・シャンパーニュ地方', 'ドイツ'],
    correctAnswer: 2,
    explanation: 'シャンパーニュは法的にフランスのシャンパーニュ地方で作られるスパークリングワインのみを指します。'
  },
  {
    id: 'L01_024',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインボトルの底の凹みを何と呼ぶ？',
    options: ['パント', 'ボトム', 'ベース', 'フット'],
    correctAnswer: 0,
    explanation: 'ボトルの底の凹みは「パント」と呼ばれ、構造強度を高める役割があります。'
  },
  {
    id: 'L01_025',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインラベルで必ず表示されている情報は？',
    options: ['価格', 'アルコール度数', '評価点数', 'テイスティングノート'],
    correctAnswer: 1,
    explanation: 'アルコール度数は法的に表示が義務付けられている基本情報です。'
  },
  {
    id: 'L01_026',
    difficulty: 1,
    category: 'ワインの基本',
    question: '一般的な赤ワイン用ブドウは何色？',
    options: ['赤色', '紫色', '黒色', '茶色'],
    correctAnswer: 2,
    explanation: '赤ワイン用ブドウは実際には「黒ブドウ」と呼ばれる濃い紫～黒色のブドウです。'
  },
  {
    id: 'L01_027',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの発酵に必要な微生物は？',
    options: ['バクテリア', '酵母', 'カビ', 'ウイルス'],
    correctAnswer: 1,
    explanation: '酵母がブドウの糖分をアルコールと炭酸ガスに変える発酵を行います。'
  },
  {
    id: 'L01_028',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「新酒」として有名なのは？',
    options: ['ボジョレー・ヌーヴォー', 'キャンティ・クラシコ', 'バローロ', 'シャトーヌフ・デュ・パプ'],
    correctAnswer: 0,
    explanation: 'ボジョレー・ヌーヴォーは11月第3木曜日に解禁される新酒として世界的に有名です。'
  },
  {
    id: 'L01_029',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'スクリューキャップの利点は？',
    options: ['高級感がある', 'コルク臭がしない', '伝統的', '開けにくい'],
    correctAnswer: 1,
    explanation: 'スクリューキャップはコルク臭（TCA）の心配がなく、酸化も防げる現代的な栓です。'
  },
  {
    id: 'L01_030',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「熟成」とは？',
    options: ['発酵を続ける', '時間とともに味わいが変化・向上', '腐る過程', '色が濃くなる'],
    correctAnswer: 1,
    explanation: '熟成は時間とともにワインの香味が複雑化し、バランスが向上する過程です。'
  },
  {
    id: 'L01_031',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'フォーティファイドワインとは？',
    options: ['アルコール度数を高めたワイン', '炭酸を加えたワイン', '甘くしたワイン', '色を濃くしたワイン'],
    correctAnswer: 0,
    explanation: 'フォーティファイド（酒精強化）ワインは、ブランデーなどを加えてアルコール度数を高めたワインです。'
  },
  {
    id: 'L01_032',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'デザートワインの特徴は？',
    options: ['食後に飲む甘口ワイン', '砂漠で作るワイン', '乾燥させたワイン', '冷凍したワイン'],
    correctAnswer: 0,
    explanation: 'デザートワインは主に食後に楽しむ甘口ワインで、様々な製法があります。'
  },
  {
    id: 'L01_033',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ブレンド」とは？',
    options: ['水を混ぜる', '複数の品種や産地を混合', '砂糖を加える', '色素を加える'],
    correctAnswer: 1,
    explanation: 'ブレンドは複数のブドウ品種や異なる畑・ヴィンテージのワインを混合することです。'
  },
  {
    id: 'L01_034',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインに含まれる主な糖分は？',
    options: ['ショ糖', 'ブドウ糖と果糖', '乳糖', '麦芽糖'],
    correctAnswer: 1,
    explanation: 'ワインの糖分は主にブドウ由来のブドウ糖（グルコース）と果糖（フルクトース）です。'
  },
  {
    id: 'L01_035',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「渋み」の正体は？',
    options: ['酸味', 'タンニン', 'アルコール', '糖分'],
    correctAnswer: 1,
    explanation: '渋みはタンニンという成分で、ブドウの皮や種、茎に含まれるポリフェノールです。'
  },
  {
    id: 'L01_036',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの保管で避けるべき条件は？',
    options: ['暗所', '振動', '一定温度', '横置き'],
    correctAnswer: 1,
    explanation: '振動はワインの熟成を妨げ、澱を巻き上げて品質を悪化させます。'
  },
  {
    id: 'L01_037',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「テーブルワイン」とは？',
    options: ['高級ワイン', '日常的に飲むワイン', 'デザート用ワイン', 'スパークリングワイン'],
    correctAnswer: 1,
    explanation: 'テーブルワインは食事と一緒に日常的に楽しむ、親しみやすいワインを指します。'
  },
  {
    id: 'L01_038',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「酸化」とは？',
    options: ['良い変化', '空気に触れて劣化', '発酵の一部', '熟成の証拠'],
    correctAnswer: 1,
    explanation: '酸化は空気（酸素）に触れることでワインが劣化し、風味が損なわれる現象です。'
  },
  {
    id: 'L01_039',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「澱（おり）」とは？',
    options: ['汚れ', '熟成過程で沈殿する成分', '添加物', '雑菌'],
    correctAnswer: 1,
    explanation: '澱は熟成過程で自然に沈殿するタンニンや色素などの成分で、品質の証拠でもあります。'
  },
  {
    id: 'L01_040',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインオープナーの基本的な種類は？',
    options: ['コルクスクリューのみ', 'ソムリエナイフ・コルクスクリュー・エアポンプ', 'ハサミ', 'ドライバー'],
    correctAnswer: 1,
    explanation: 'ソムリエナイフ、シンプルなコルクスクリュー、エアポンプ式など様々なタイプがあります。'
  },
  {
    id: 'L01_041',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「フルボディ」とは？',
    options: ['完全なワイン', '濃厚で重いワイン', '甘いワイン', '古いワイン'],
    correctAnswer: 1,
    explanation: 'フルボディは濃厚で重厚感があり、口の中でしっかりとした存在感のあるワインです。'
  },
  {
    id: 'L01_042',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ライトボディ」とは？',
    options: ['軽いアルコール', '薄い色', '軽やかで繊細なワイン', '新しいワイン'],
    correctAnswer: 2,
    explanation: 'ライトボディは軽やかで繊細、飲みやすい口当たりのワインを指します。'
  },
  {
    id: 'L01_043',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインと料理の「マリアージュ」とは？',
    options: ['結婚式', '相性の良い組み合わせ', '混ぜること', '同時に作ること'],
    correctAnswer: 1,
    explanation: 'マリアージュはワインと料理の相性が良く、互いを引き立て合う組み合わせのことです。'
  },
  {
    id: 'L01_044',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「アフターテイスト」とは？',
    options: ['食後の味', '飲んだ後の余韻', '追加の味', '最後の一口'],
    correctAnswer: 1,
    explanation: 'アフターテイストは飲み込んだ後に口の中に残る香味の余韻のことです。'
  },
  {
    id: 'L01_045',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「バイオダイナミック」農法とは？',
    options: ['機械的農法', '有機農法をさらに発展させた農法', '化学的農法', '工業的農法'],
    correctAnswer: 1,
    explanation: 'バイオダイナミック農法は有機農法をベースに、天体のリズムなども考慮した農法です。'
  },
  {
    id: 'L01_046',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「コルク臭」の原因は？',
    options: ['古いコルク', 'TCA（トリクロロアニソール）', '湿気', '酸化'],
    correctAnswer: 1,
    explanation: 'コルク臭はTCA（トリクロロアニソール）という化合物が原因で、カビ臭い不快な臭いがします。'
  },
  {
    id: 'L01_047',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインボトルの標準的な形で最も一般的なのは？',
    options: ['ボルドー型', 'ブルゴーニュ型', 'ライン型', 'シャンパーニュ型'],
    correctAnswer: 0,
    explanation: 'ボルドー型は肩の張った最も一般的なボトル形状で、世界中で使用されています。'
  },
  {
    id: 'L01_048',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ヴィンテージなし」とは？',
    options: ['古いワイン', '複数年のブレンド', '品質が悪い', '偽物'],
    correctAnswer: 1,
    explanation: 'ヴィンテージなし（NV）は複数年のワインをブレンドして一定品質を保つ手法です。'
  },
  {
    id: 'L01_049',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「キャップシール」の目的は？',
    options: ['装飾', 'コルクの保護と偽造防止', '温度調節', '香り保持'],
    correctAnswer: 1,
    explanation: 'キャップシール（フォイル）はコルクを保護し、偽造を防ぐ役割があります。'
  },
  {
    id: 'L01_050',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインを注ぐ際の適切な量は？',
    options: ['グラス満杯', 'グラスの3/4', 'グラスの1/3', 'グラスの1/5'],
    correctAnswer: 2,
    explanation: 'ワインはグラスの1/3程度が適量で、香りを楽しみ、スワリングもできます。'
  },
  {
    id: 'L01_051',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ドサージュ」とは？',
    options: ['量を測る', 'スパークリングワインの糖分調整', '温度調整', '圧力調整'],
    correctAnswer: 1,
    explanation: 'ドサージュはシャンパーニュなどスパークリングワインで最終的な甘さを調整する工程です。'
  },
  {
    id: 'L01_052',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「マロラクティック発酵」の効果は？',
    options: ['アルコール度数向上', '酸味をまろやかにする', '色を濃くする', '泡を作る'],
    correctAnswer: 1,
    explanation: 'マロラクティック発酵は鋭い酸味をまろやかにし、ワインを柔らかくする二次発酵です。'
  },
  {
    id: 'L01_053',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「デゴルジュマン」とは？',
    options: ['発酵開始', 'シャンパーニュの澱抜き', '瓶詰め', '圧搾'],
    correctAnswer: 1,
    explanation: 'デゴルジュマンはシャンパーニュ製造で澱を取り除く重要な工程です。'
  },
  {
    id: 'L01_054',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「ナチュラルワイン」の特徴は？',
    options: ['自然な環境で保管', '添加物を極力使わない', '自然発酵のみ', '野生酵母使用'],
    correctAnswer: 1,
    explanation: 'ナチュラルワインは亜硫酸塩などの添加物を極力使わずに造られるワインです。'
  },
  {
    id: 'L01_055',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ブレット」とは？',
    options: ['良い香り', 'ブレタノマイセス酵母による異臭', '樽の香り', '果実の香り'],
    correctAnswer: 1,
    explanation: 'ブレットはブレタノマイセス酵母による馬小屋や絆創膏のような異臭を指します。'
  },
  {
    id: 'L01_056',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「pH」が低いと？',
    options: ['甘くなる', '酸味が強い', '渋みが強い', 'アルコールが高い'],
    correctAnswer: 1,
    explanation: 'pHが低い（酸性）ほど酸味が強く、保存性も良くなります。'
  },
  {
    id: 'L01_057',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「残糖」とは？',
    options: ['追加した糖', '発酵で残った糖分', '人工甘味料', '果実の糖'],
    correctAnswer: 1,
    explanation: '残糖は発酵で消費されずに残った糖分で、ワインの甘さを決定します。'
  },
  {
    id: 'L01_058',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「揮発酸」が高いと？',
    options: ['良い香り', '酢のような不快臭', '果実香が強い', '樽香が強い'],
    correctAnswer: 1,
    explanation: '揮発酸が高すぎると酢酸臭という酢のような不快な臭いが発生します。'
  },
  {
    id: 'L01_059',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインボトルの「パント」の深さの意味は？',
    options: ['深いほど高級', '強度のための構造', '容量調整', '見た目のデザイン'],
    correctAnswer: 1,
    explanation: 'パントの深さは主にボトルの構造強度を高める目的で、品質とは直接関係ありません。'
  },
  {
    id: 'L01_060',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「濁り」の一般的な原因は？',
    options: ['高品質の証拠', '濾過不足や澱の巻き上がり', '糖分が多い', 'アルコールが高い'],
    correctAnswer: 1,
    explanation: '濁りは通常、濾過不足や澱の巻き上がり、時には品質上の問題を示します。'
  },
  {
    id: 'L01_061',
    difficulty: 1,
    category: 'ワインの基本',
    question: '「グリーンハーベスト」とは？',
    options: ['緑色のブドウ収穫', '早期収穫', '摘房・摘粒', '有機栽培'],
    correctAnswer: 2,
    explanation: 'グリーンハーベストは房や粒を間引いて収量を制限し、品質を向上させる技術です。'
  },
  {
    id: 'L01_062',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「SO2」とは？',
    options: ['糖分', '酸化防止剤（亜硫酸塩）', 'アルコール', '酸味成分'],
    correctAnswer: 1,
    explanation: 'SO2（二酸化硫黄）は酸化防止と殺菌のために使用される添加物です。'
  },
  {
    id: 'L01_063',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「クリア」とは？',
    options: ['透明', '澄んで透明度が高い', '色が薄い', '味がすっきり'],
    correctAnswer: 1,
    explanation: 'クリアは濁りがなく澄んで透明度が高い状態を表すテイスティング用語です。'
  },
  {
    id: 'L01_064',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ハーフボトル」の容量は？',
    options: ['250ml', '375ml', '500ml', '600ml'],
    correctAnswer: 1,
    explanation: 'ハーフボトルは375mlで、標準的な750mlボトルの半分の容量です。'
  },
  {
    id: 'L01_065',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「マグナムボトル」の容量は？',
    options: ['1000ml', '1500ml', '2000ml', '3000ml'],
    correctAnswer: 1,
    explanation: 'マグナムボトルは1500mlで、標準ボトルの2倍の容量です。'
  },
  {
    id: 'L01_066',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ヴァラエタル」とは？',
    options: ['産地名', '単一品種ワイン', '生産者名', '収穫年'],
    correctAnswer: 1,
    explanation: 'ヴァラエタル（バラエタル）ワインは単一のブドウ品種から作られるワインです。'
  },
  {
    id: 'L01_067',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「カーヴ」とは？',
    options: ['ワイン畑', 'ワイン貯蔵庫', 'ワイン工場', 'ワインショップ'],
    correctAnswer: 1,
    explanation: 'カーヴ（Cave）はワインを貯蔵・熟成させる地下貯蔵庫のことです。'
  },
  {
    id: 'L01_068',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「エステート」とは？',
    options: ['不動産', '自社畑のワイン', '高級ワイン', '古いワイン'],
    correctAnswer: 1,
    explanation: 'エステートワインは生産者が所有する自社畑のブドウのみで作ったワインです。'
  },
  {
    id: 'L01_069',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「プレミアム」とは？',
    options: ['保険', '高品質・高価格帯', '新しいワイン', '限定ワイン'],
    correctAnswer: 1,
    explanation: 'プレミアムワインは高品質で高価格帯の上級ワインを指します。'
  },
  {
    id: 'L01_070',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「リザーヴ」とは？',
    options: ['予約', '特別に選んだ高級ワイン', '古いワイン', '甘いワイン'],
    correctAnswer: 1,
    explanation: 'リザーヴは特別に選んだ優良なワインに使われる用語ですが、法的定義は国により異なります。'
  },
  {
    id: 'L01_071',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「シングルヴィンヤード」とは？',
    options: ['一人の生産者', '単一畑のワイン', '一本のブドウ樹', '一年だけの生産'],
    correctAnswer: 1,
    explanation: 'シングルヴィンヤードは単一の畑のブドウのみで作られたワインです。'
  },
  {
    id: 'L01_072',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「オールドヴァイン」とは？',
    options: ['古いワイン', '樹齢の高いブドウ樹', '古い製法', '伝統的品種'],
    correctAnswer: 1,
    explanation: 'オールドヴァインは樹齢が高いブドウ樹から作られるワインで、一般的に品質が高いとされます。'
  },
  {
    id: 'L01_073',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「コールドソーク」とは？',
    options: ['冷蔵保存', '低温での醸し', '氷で冷やす', '冷水で洗う'],
    correctAnswer: 1,
    explanation: 'コールドソークは発酵前に低温でブドウを醸し、色素や香味成分を抽出する技法です。'
  },
  {
    id: 'L01_074',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「バトナージュ」とは？',
    options: ['バトンで混ぜる', '澱を攪拌する', '圧搾する', '濾過する'],
    correctAnswer: 1,
    explanation: 'バトナージュは樽内の澱を攪拌してワインに旨味とコクを与える技法です。'
  },
  {
    id: 'L01_075',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「フィニング」とは？',
    options: ['仕上げ', '清澄処理', '熟成終了', '瓶詰め'],
    correctAnswer: 1,
    explanation: 'フィニングは清澄剤を使ってワインの濁りや不要な成分を除去する清澄処理です。'
  },
  {
    id: 'L01_076',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ラッキング」とは？',
    options: ['棚に並べる', '澱引き', '栓を抜く', '値段をつける'],
    correctAnswer: 1,
    explanation: 'ラッキングは澱を除去するためにワインを別の容器に移す澱引き作業です。'
  },
  {
    id: 'L01_077',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ピジャージュ」とは？',
    options: ['足で踏む', '果帽を突き崩す', '手で混ぜる', '機械で圧搾'],
    correctAnswer: 1,
    explanation: 'ピジャージュは発酵中に浮上する果帽を突き崩して色素や成分を抽出する作業です。'
  },
  {
    id: 'L01_078',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ルモアージュ」とは？',
    options: ['騒音', 'シャンパーニュの動瓶', '混合', '発酵'],
    correctAnswer: 1,
    explanation: 'ルモアージュはシャンパーニュ製造で澱を瓶口に集める動瓶作業です。'
  },
  {
    id: 'L01_079',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「エレヴァージュ」とは？',
    options: ['標高', '育成・熟成', '発酵', '収穫'],
    correctAnswer: 1,
    explanation: 'エレヴァージュはワインの育成・熟成期間とその管理を指すフランス語です。'
  },
  {
    id: 'L01_080',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「アッサンブラージュ」とは？',
    options: ['組み立て', 'ブレンド', '分解', '発酵'],
    correctAnswer: 1,
    explanation: 'アッサンブラージュは異なるワインをブレンドして最終的なワインを組み立てる作業です。'
  },
  {
    id: 'L01_081',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「シャプタリザシオン」とは？',
    options: ['帽子をかぶせる', '補糖', '酸味調整', '色調整'],
    correctAnswer: 1,
    explanation: 'シャプタリザシオンは糖分不足を補うために発酵前に糖分を添加することです。'
  },
  {
    id: 'L01_082',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「アシディフィカシオン」とは？',
    options: ['酸化', '酸味調整', '発酵', '熟成'],
    correctAnswer: 1,
    explanation: 'アシディフィカシオンは酸味不足を補うために酸を添加する調整です。'
  },
  {
    id: 'L01_083',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「デアルコライゼーション」とは？',
    options: ['アルコール添加', 'アルコール除去', '発酵促進', '糖分除去'],
    correctAnswer: 1,
    explanation: 'デアルコライゼーションはワインからアルコールを除去する処理です。'
  },
  {
    id: 'L01_084',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「コンセントレーション」とは？',
    options: ['集中', '濃縮', '発酵', '希釈'],
    correctAnswer: 1,
    explanation: 'コンセントレーションはワインの水分を除去して成分を濃縮する技術です。'
  },
  {
    id: 'L01_085',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ミクロオキシジェナシオン」とは？',
    options: ['微量酸素添加', '酸素除去', '炭酸添加', '窒素添加'],
    correctAnswer: 0,
    explanation: 'ミクロオキシジェナシオンは微量の酸素を意図的に添加してワインを柔らかくする技術です。'
  },
  {
    id: 'L01_086',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「イナーティング」とは？',
    options: ['不活性化', '不活性ガス充填', '発酵停止', '酸化防止'],
    correctAnswer: 1,
    explanation: 'イナーティングは窒素などの不活性ガスでタンクを満たし酸化を防ぐ技術です。'
  },
  {
    id: 'L01_087',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「スタビライゼーション」とは？',
    options: ['安定化処理', '発酵促進', '熟成促進', '色素固定'],
    correctAnswer: 0,
    explanation: 'スタビライゼーションはワインの安定性を高めるための各種処理の総称です。'
  },
  {
    id: 'L01_088',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「フィルトレーション」とは？',
    options: ['発酵', '濾過', '熟成', '圧搾'],
    correctAnswer: 1,
    explanation: 'フィルトレーションは濾過によってワインから不純物や微生物を除去する処理です。'
  },
  {
    id: 'L01_089',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「コールドスタビリゼーション」とは？',
    options: ['冷凍保存', '低温による安定化', '冷却発酵', '氷点下熟成'],
    correctAnswer: 1,
    explanation: 'コールドスタビリゼーションは低温でワインを安定化させ、結晶の析出を防ぐ処理です。'
  },
  {
    id: 'L01_090',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ヒートスタビリゼーション」とは？',
    options: ['加熱調理', '熱による安定化', '温度管理', '保温'],
    correctAnswer: 1,
    explanation: 'ヒートスタビリゼーションは加熱によってワインを安定化させる処理です。'
  },
  {
    id: 'L01_091',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ベントナイト」の用途は？',
    options: ['甘味料', '清澄剤', '保存料', '着色料'],
    correctAnswer: 1,
    explanation: 'ベントナイトは粘土系の清澄剤で、タンパク質の除去に使用されます。'
  },
  {
    id: 'L01_092',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「エッグホワイト」の用途は？',
    options: ['栄養添加', '天然清澄剤', '防腐剤', '発酵促進'],
    correctAnswer: 1,
    explanation: '卵白は伝統的な天然清澄剤として高級ワインの清澄に使用されます。'
  },
  {
    id: 'L01_093',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「イシングラス」とは？',
    options: ['ガラス片', '魚の浮き袋由来の清澄剤', '鉱物', '植物繊維'],
    correctAnswer: 1,
    explanation: 'イシングラスは魚の浮き袋から作られる天然の清澄剤です。'
  },
  {
    id: 'L01_094',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「PVPP」とは？',
    options: ['ビタミン', '合成清澄剤', '酸化防止剤', '発酵助剤'],
    correctAnswer: 1,
    explanation: 'PVPP（ポリビニルポリピロリドン）はタンニンや色素を除去する合成清澄剤です。'
  },
  {
    id: 'L01_095',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「活性炭」の用途は？',
    options: ['色素除去', '発酵促進', '甘味付与', 'アルコール調整'],
    correctAnswer: 0,
    explanation: '活性炭は色素や異臭を除去するために使用される清澄剤です。'
  },
  {
    id: 'L01_096',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「ディアトマイト」とは？',
    options: ['化学薬品', '珪藻土濾過助剤', '酵母', '細菌'],
    correctAnswer: 1,
    explanation: 'ディアトマイト（珪藻土）は濾過を助ける天然の濾過助剤です。'
  },
  {
    id: 'L01_097',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「パーライト」とは？',
    options: ['真珠', '火山ガラス系濾過助剤', '石灰石', '結晶'],
    correctAnswer: 1,
    explanation: 'パーライトは火山ガラス系の濾過助剤として使用される鉱物です。'
  },
  {
    id: 'L01_098',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「セルロース」フィルターとは？',
    options: ['金属フィルター', '植物繊維フィルター', '化学フィルター', '磁石フィルター'],
    correctAnswer: 1,
    explanation: 'セルロースフィルターは植物繊維を原料とする濾過フィルターです。'
  },
  {
    id: 'L01_099',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「メンブレン」フィルターとは？',
    options: ['膜フィルター', '金網フィルター', '砂フィルター', '炭フィルター'],
    correctAnswer: 0,
    explanation: 'メンブレン（膜）フィルターは極小の孔を持つ精密濾過フィルターです。'
  },
  {
    id: 'L01_100',
    difficulty: 1,
    category: 'ワインの基本',
    question: 'ワインの「クロスフロー」フィルターとは？',
    options: ['十字型', '横流れ式濾過', '逆流式', '回転式'],
    correctAnswer: 1,
    explanation: 'クロスフロー濾過は液体を膜に平行に流して濾過効率を高める方式です。'
  }
];