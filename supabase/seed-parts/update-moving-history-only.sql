-- personal-moving-history 1本だけの更新（冪等）
-- ═══ personal-moving-history — 引っ越しの歴史
insert into public.timelines (slug, owner_id, title, description, category, language, visibility, share_id, start_year, end_year, cover_seed)
values ('personal-moving-history', '00000000-0000-4000-8000-f4a4aa64320d', '引っ越しの歴史', '1955年生まれの私が経験した、社宅から団地、四畳半、持ち家までの引っ越しの記録です。住まいをそれぞれ「期間の線」として引き、家族の時間と日本の住宅史の線を重ねました。線と線の重なりから、間取りの変化が時代をどう映してきたのかを、落ち着いて振り返ってみます。', 'personal-life', 'ja', 'public', 's_personal-moving-history', 1954, 2026, 'personal-moving-history')
on conflict (slug) do update set owner_id = excluded.owner_id, title = excluded.title, description = excluded.description, category = excluded.category,
  start_year = excluded.start_year, end_year = excluded.end_year, updated_at = now();
delete from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history');
delete from public.events where timeline_id = (select id from public.timelines where slug = 'personal-moving-history');
insert into public.layers (timeline_id, name, color, position) values ((select id from public.timelines where slug = 'personal-moving-history'), '引っ越しの記録', 'orange', 0);
insert into public.layers (timeline_id, name, color, position) values ((select id from public.timelines where slug = 'personal-moving-history'), '家族の節目', 'pink', 1);
insert into public.layers (timeline_id, name, color, position) values ((select id from public.timelines where slug = 'personal-moving-history'), '住宅と都市の時代', 'blue', 2);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1954-12-01', '1973-11-30', 'month', 'period', '高度経済成長の19年', '神武景気に始まりオイルショックで終わる、日本経済がひたすら膨らんだ19年間です。所得倍増、三種の神器、マイホーム。暮らしにかかわる言葉の多くが、この線の上に並んでいます。

私の社宅も、千里の団地も、この線の中の出来事でした。住まいの線と重ねると、暮らしの器が経済の勢いに引っぱられて大きくなっていくのが見えます。成長の線が切れた翌年、私の住まいは風呂なし四畳半になりました。', null,
          'disputed', '高度経済成長の期間には諸説あります。ここでは神武景気の始まり(1954年12月)から第一次オイルショック(1973年11月)までを採りました。', 'user', 0) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('内閣府: 景気基準日付', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '1961-04-01', '1970-02-28', 'month', 'period', '八幡の社宅2K、はじまりの9年', '父の転勤で、6歳の春から製鉄所の社宅に9年間暮らしました。台所と二間の2K、風呂は共同棟で、近所と湯の順番を分け合ったものです。廊下に七輪、玄関に自転車。記録に残る、私のいちばん古い住まいです。

高度経済成長のただ中で、企業の社宅は住宅不足を補う大きな受け皿でした。**家が会社とともにあった時代**の記憶であり、この年表の出発点になる9年間です。', null,
          'verified', null, 'user', 1) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1962-09-01', null, 'month', 'point', '千里ニュータウンでまちびらき', '大阪の千里丘陵で、日本初の大規模ニュータウンへの入居が始まりました。公団・公社・府営の住宅が丘を覆い、「ニュータウン」という言葉が現実の風景になった年です。

深刻な住宅不足に対する、国としての回答でした。のちに私の一家も、この丘に移り住むことになります(引っ越しの記録レイヤー)。団地のダイニングキッチンは、食寝分離という新しい暮らし方を全国に広めていきました。', null,
          'verified', null, 'user', 2) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('吹田市: 千里ニュータウンのあゆみ', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1968-10-01', null, 'month', 'point', '総住宅数が総世帯数を上回る', '昭和43年住宅統計調査で、全国の住宅数が初めて世帯数を上回りました。戦後の「住宅難」が量の面では峠を越えたことを示す、節目の数字です。

以後の住宅政策は、量から質へと軸足を移していきます。とはいえ都市部の狭さは残り、私たちが暮らす2Kの社宅も例外ではありませんでした。広さを求める引っ越しは、まだ始まったばかりだったのです。', null,
          'verified', null, 'user', 3) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('総務省統計局: 昭和43年住宅統計調査', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '1970-03-01', '1974-03-31', 'month', 'period', '千里ニュータウン3DKの4年間', '父の大阪転勤に伴い、15歳の春から千里の公団住宅3DKで4年間を過ごしました。ダイニングキッチンと洋間、ベランダ、水洗トイレ。八幡の社宅とは別世界で、初めて自分の机を持たせてもらいました。

入居の直後、窓の向こうの丘で万博が始まります。この住まいの線に万博の線が重なるのを見ると、あの春の浮き立った空気を思い出します。**2Kから3DKへ**という間取りの変化は、そのまま日本の暮らしの上昇曲線でした。', null,
          'verified', null, 'user', 4) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1970-03-15', '1970-09-13', 'day', 'period', '大阪万博の183日間', '千里丘陵で日本万国博覧会が開かれ、183日間で約6,400万人が来場しました。「人類の進歩と調和」を掲げ、動く歩道やワイヤレステレホンが未来の暮らしを演出していました。

会場は、移り住んだばかりのニュータウンの隣でした。私は入場券を握って何度も通ったものです。住宅政策が生んだ丘が、そのまま未来の展示場になった半年。団地の子どもの半年は、丸ごと万博とともにありました。', null,
          'verified', null, 'user', 5) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('大阪府: 日本万国博覧会(EXPO''70)の記録', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1973-10-01', null, 'month', 'point', '第一次オイルショック', '第四次中東戦争を機に原油価格が高騰し、「狂乱物価」と呼ばれるインフレが起きました。トイレットペーパー騒動が象徴するように、高度成長の前提が揺らいだ年です。

建築資材も高騰し、持ち家は遠のきました。翌年に上京する私の住まいが風呂なし四畳半になったのは、仕送りの目減りと無関係ではありません。成長の終わりは、まず家賃と物価に現れたのです。', null,
          'verified', null, 'user', 6) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('経済企画庁『昭和49年 年次経済報告』', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '1974-04-01', '1979-03-31', 'month', 'period', '風呂なし四畳半の学生時代、5年', '大学進学で、東京・中野の木造アパートに5年間住みました。四畳半に押し入れ、便所は共同、風呂は銭湯。家賃は月9,000円だったと手帳に残っています。

オイルショック直後の物価高で仕送りは目減りし、銭湯は週3回に節約しました。それでも、初めて自分で選んだ住所でした。団地育ちの目に、木造下宿の路地は古くて新しい東京でした。銭湯の帰りに買うコロッケが贅沢だったものです。', null,
          'verified', null, 'user', 7) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '1979-04-01', '1985-05-31', 'month', 'period', '川崎の独身寮6畳、働きはじめの6年', 'メーカーに就職し、結婚するまでの6年間を川崎の独身寮で過ごしました。6畳一間に作り付けの棚、食堂と大浴場は共同です。同期と廊下で夜通し話したものでした。寮費は安く、月給の多くが貯金に回りました。

社宅に生まれ、寮で働き始める。**住まいがずっと会社の敷地の中にあった**ことに気づくのは、ずっと後のことです。福利厚生としての住宅は、この時代の大企業の標準装備でした。', null,
          'verified', null, 'user', 8) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '家族の節目'),
          '1985-05-01', null, 'month', 'point', '結婚', '29歳の春に、同じ会社の同期と結婚しました。式は横浜の小さな会場で挙げ、寮を出る日には管理人さんが赤飯を炊いてくれました。新居の家具は、ふたりの貯金で少しずつ揃えたものです。

結婚は住まいの転機でもあり、翌月にはふたりで中野の賃貸2DKへ移ります(引っ越しの記録レイヤー)。この年の秋のプラザ合意から円高と地価高騰の時代が始まることを、当時のふたりはまだ知りませんでした。', null,
          'verified', null, 'user', 9) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '1985-06-01', '1991-01-31', 'month', 'period', '新婚の中野2DK、6年', '結婚を機に、学生時代を過ごした中野へ戻り、賃貸マンションの2DKで6年間暮らしました。家賃は月6万8,000円。あの四畳半の下宿から、歩いて10分の場所でした。

この部屋で長女が生まれ、家族が3人になります。この住まいの線の後半は、バブル景気の線とそっくり重なっています。地価は高騰を続け、「買うなら早く」という世間の焦りが、次の引っ越しの伏線になっていきました。', null,
          'verified', null, 'user', 10) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1986-12-01', '1991-02-28', 'month', 'period', 'バブル景気の51か月', '地価と株価が実力を離れて駆け上がった51か月です。内閣府の景気基準日付でいう平成景気の拡張期にあたり、「財テク」「地上げ」という言葉が茶の間にまで届きました。

この線は、私たちの中野の2DKの後半にそっくり重なっています。地価の高騰に追い立てられるように家を探し、線が途切れる最後の月に埼玉の家を契約しました。重ねてみて初めて、自分たちがバブルの尻尾を掴んでいたとわかるのです。', null,
          'verified', null, 'user', 11) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('内閣府: 景気基準日付', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '家族の節目'),
          '1988-03-01', null, 'month', 'point', '長女誕生', '中野の2DKに、家族が3人になりました。ベビーベッドを置くと居間はほぼ埋まり、押し入れの半分が子どもの物になりました。

子どもの成長は、面積の問題でもあります。この頃、都心の地価高騰は郊外へ波及し、通勤圏はどんどん外へ延びていました(住宅と都市の時代レイヤー)。「広さは遠さで買う」しかない時代に、私たちの家探しは始まったのです。', null,
          'verified', null, 'user', 12) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '家族の節目'),
          '1988-03-01', '2010-03-31', 'month', 'period', '長女と暮らした22年間', '長女が生まれてから、就職して家を出るまでの22年間です。中野の2DKで始まり、埼玉の家で続いた、いちばん賑やかな時間でした。子ども部屋の壁の落書きは、家を売る日まで残しておいたものです。

この線を住まいの線に重ねると、子育ての大半が持ち家の30年に収まっていることがわかります。学区で家を選び、子どもが出たあとも家だけが残る。**家の寿命と家族の時間はずれている**。それが、この重なりの教えてくれることです。', null,
          'verified', null, 'user', 13) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '1991-02-01', '2021-05-31', 'month', 'period', '埼玉の持ち家4LDK、30年', '埼玉の郊外に建売の4LDKを買い、30年住みました。都心まで通勤90分。価格は年収の7倍を超え、頭金は双方の親に頼りました。契約の日の営業マンの「今買わないと一生買えませんよ」という言葉を覚えています。

買ったのは、バブル景気の線が途切れるまさにその月でした。資産価値は長く戻りませんでしたが、庭と子ども部屋のある家は**遠さと引き換えに手に入れた広さ**でした。この30年の線の上に、子育ての線も単身赴任の線も乗っています。', null,
          'verified', null, 'user', 14) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '住宅と都市の時代'),
          '1992-03-01', null, 'month', 'point', '公示地価が下落、土地神話の終わり', '1992年の地価公示で全国平均の地価が下落に転じ、上がり続けることが前提だった「土地神話」が崩れました。住宅地の下落は、以後長く続きます。

前年に郊外の家を買った私たちには、他人事ではありませんでした。ただしピークの時期や下落幅は地域と用途で大きく異なり、一つの数字では語れません。確かなのは、「家は買えば得」という常識が終わったことです。', null,
          'disputed', '地価のピーク時期や下落幅は地域・用途により大きく異なり、全国一律の数値としては確定できません。', 'user', 15) returning id)
insert into public.event_sources (event_id, title, url) select ev.id, v.title, v.url from ev, (values ('国土庁: 平成4年地価公示', null)) as v(title, url);
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '2001-04-01', '2004-03-31', 'month', 'period', '名古屋へ単身赴任、1Kの3年間', '46歳で名古屋勤務となり、単身赴任の1Kマンションで3年を過ごしました。荷物は段ボール10箱。埼玉の持ち家の線の上に、もう1本の住まいの線が重なって走る3年間です。

週末に新幹線で往復する暮らしは、持ち家が動けないことの裏返しでもありました。ローンを抱えた家は家族を郊外に留め、仕事は父だけを都市へ動かす。この時代の転勤族に共通する構図だったと思います。', null,
          'verified', null, 'user', 16) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '家族の節目'),
          '2015-03-01', null, 'month', 'point', '定年退職', '60歳で定年を迎え、川崎の独身寮から数えて36年の会社勤めを終えました。最後の出社の日は、社宅と寮の思い出話ばかりしていたものです。次の住まいを考え始めたのは、それから半年後のことでした。

通勤がなくなると、通勤90分という立地は意味を変えます。広い家は夫婦ふたりには余り、駅から遠い坂道は年々こたえるようになりました。住まいの条件は、人生の段階ごとに書き換わっていくのです。', null,
          'verified', null, 'user', 17) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '家族の節目'),
          '2019-11-01', null, 'month', 'point', '母を見送り、八幡の実家を手放す', '春に母を見送り、秋に空き家となった実家を売却しました。買い手がつくまで半年かかりました。家財の処分は業者に頼み、アルバムだけ段ボール2箱持ち帰りました。庭の金木犀だけ、枝を一本もらってきたのです。

全国で846万戸といわれた空き家の一戸が、うちの実家でした。**統計の中に自分の家がある**という感覚は、この年表を書き始めた理由のひとつです。', null,
          'verified', null, 'user', 18) returning id)
select 1 from ev;
with ev as (insert into public.events (timeline_id, layer_id, event_date, end_date, date_precision, event_type, title, summary, detail, credibility, credibility_note, origin, position)
  values ((select id from public.timelines where slug = 'personal-moving-history'),
          (select id from public.layers where timeline_id = (select id from public.timelines where slug = 'personal-moving-history') and name = '引っ越しの記録'),
          '2021-06-01', '2026-06-30', 'month', 'period', '駅前の中古マンション2LDK、いまの住まい', '30年住んだ埼玉の家を売り、駅から徒歩3分の中古マンション2LDKに移りました。荷物は半分に減らし、本と写真だけは全部持ってきました。おそらく人生最後の、そして現在も続いている住まいの線です。

コロナ禍で、郊外の庭付き住宅に思わぬ買い手がつきました。社宅の2Kに始まり、団地、四畳半、寮、持ち家、そして駅前の2LDKへ。**間取りの遍歴は、そのまま時代の遍歴だった**と、いま振り返って思うのです。', null,
          'verified', null, 'user', 19) returning id)
select 1 from ev;

