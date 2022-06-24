// npm i cheerio superagent -D

import fs from "fs";
import cheerio from "cheerio";
import superagent from "superagent";

// 怎么都是 o 结尾的？ mihoyo ？ 哦，懂了
// const Translate = [
//   { cn: "火", en: "pyro" },
//   { cn: "草", en: "dendro" },
//   { cn: "水", en: "hydro" },
//   { cn: "雷", en: "electro" },
//   { cn: "风", en: "anemo" },
//   { cn: "冰", en: "cyro" },
//   { cn: "岩", en: "geo" },
// ];

const GenmaUrl = "https://genshin.honeyhunterworld.com/db/enemy/?lang=CHS";
const GenmaWebPrefixUrl = "https://genshin.honeyhunterworld.com";

let GenmaList = []; // 原魔列表

const _path = process.cwd();
if (!fs.existsSync(`${_path}/data/Genma/`)) {
  fs.mkdirSync(`${_path}/data/Genma/`);
}

// 获取原魔列表
async function getGenmaList() {
  if (fs.existsSync(`${_path}/data/Genma/GenmaList.json`)) {
    GenmaList = JSON.parse(fs.readFileSync(`${_path}/data/Genma/GenmaList.json`, "utf8"));
  } else {
    initGenmaList();
  }
}

getGenmaList();

export async function test() {
  let genma = GenmaList[138];

  superagent.get(genma.url, (err, res) => {
    if (err) {
      Bot.logger.mark(err);
      return true;
    }

    const $ = cheerio.load(res.text);
    let genmaData = {}; // 原魔数据对象
    genmaData.name = $(".custom_title").text();
    genmaData.description = $('.item_main_table').eq(0).find('tr').eq(3).find('td').eq(1).html();

    // 提取原魔掉落物品
    genmaData.drops = getDropListFromGenmaPage($);

    // 提取原魔三维数据，页面中可能有多个，比如公子多个阶段，或者意义不明的多个重复数据
    let genmaInfoList = $(".monster_stat_table");
    let infoList = []; // 原魔信息列表

    genmaInfoList.each(function () {
      let $bro = $(this).next();
      if ($bro.attr("class") != "item_secondary_title") return; // 没有副标题，这不是一个正常的原魔数据，跳过

      let info = {}; // 信息对象

      let $statEle = $(this).eq(0).find("tr");
      // 提取基础数据
      info.name = $statEle.eq(0).text() || genmaData.name;
      getGenmaShieldInfoFromGenmaPage($, $statEle, info);

      // 提取原魔标签信息
      let $tagEle = $(this).find(".monster_stat_table");
      let tagSet = new Set();
      if ($tagEle.length) {
        $tagEle.each(function() {
          let tag = $(this).find("tr").eq(1).find("td").text();
          tagSet.add(tag);
        });
      }
      let tags = [...tagSet].join(',');
      info.tags = tags;

      // 提取等级数据
      let $levelListEle = $(this).next().next().find("tr");
      info.levelInfo = getGenmaLevelInfoFromGenmaPage($, $levelListEle);

      for (let val of infoList) {
        if (JSON.stringify(val) === JSON.stringify(info)) return;
      }
      infoList.push(info);
    });

    genmaData.infoList = infoList;
    saveGenmaSingleInfo(genma, genmaData);
  });
}

// 提取原魔掉落信息  <- 建立在原魔信息页面
function getDropListFromGenmaPage($) {
  const dropsReg = /(i_\d*)|(a_\d*)/g;
  const dropsStarReg = /\dstar/g;
  const dropInfoList = $('.asc_amount');
  let drops = []; // 掉落物品列表

  dropInfoList.each(function() {
    let $prev = $(this).prev();
    if ($prev.attr("class") != "itempic_cont lazy") return;

    let name = $(this).text().trim();
    let star = '';
    let starMatch = $prev.attr("data-bg").match(dropsStarReg);
    if (starMatch && starMatch.length) {
      star = starMatch[0].substr(0, 1);
    }

    let img = $prev.find("img").attr("data-src");
    let matchList = img.match(dropsReg);
    if (!matchList || matchList.length === 0) {
      return; // 容错，无法匹配的那就溜溜球
    }
    let id = matchList[0];
    let imgUrl = `${GenmaWebPrefixUrl}${img}`;

    drops.push({ id, name, star, imgUrl });
  });

  return drops;
}

// 提取原魔抗性等数据  <- 建立在原魔信息页面
function getGenmaShieldInfoFromGenmaPage($, $statEle, info) {
  let shieldInfo = $statEle.eq(3).find("td");
  // 这个真不知道该怎么处理，就用比较蠢的方法吧，大家都看得懂
  shieldInfo.each(function (idx) {
    switch (idx) {
      case 0:
        info.hp = $(this).text();
        break;
      case 1:
        info.atk = $(this).text();
        break;
      case 2:
        info.def = $(this).text();
        break;
      case 3:
        info.shield = $(this).text();
        break;
      case 4:
        info.pyroShield = $(this).text();
        break;
      case 5:
        info.dendroShield = $(this).text();
        break;
      case 6:
        info.hydroShield = $(this).text();
        break;
      case 7:
        info.electroShield = $(this).text();
        break;
      case 8:
        info.anemoShield = $(this).text();
        break;
      case 9:
        info.cyroShield = $(this).text();
        break;
      case 10:
        info.geoShield = $(this).text();
        break;
    }
  });
}

// 提取原魔等级数据  <- 建立在原魔信息页面
function getGenmaLevelInfoFromGenmaPage($, $levelListEle) {
  let levelInfo = []; // 连带着表头一起，提取全部的等级数据，这就相当于一个table啦
  $levelListEle.each(function(idx) {
    levelInfo[idx] = [];
    $(this).find("td").each(function() {
      levelInfo[idx].push($(this).text());
    })
  });

  return levelInfo;
}

// 初始化原魔列表
async function initGenmaList() {
  const IdReg = /m_\d*/g;

  superagent.get(GenmaUrl, (err, res) => {
    if (err) {
      Bot.logger.mark(err);
      return true;
    }

    const $ = cheerio.load(res.text);
    let genmaEleList = $(".char_sea_cont.enemy_sea_cont");

    GenmaList = [];
    genmaEleList.each(function () {
      let idEle = $(this).children().find("a").eq(0);
      let imgEle = $(this).children().find("img");
      let nameEle = $(this).children().find("span.sea_charname");

      let idHref = idEle[0]?.attribs?.href;
      let genmaId = idHref && idHref.match(IdReg)[0];

      let imgSrc = imgEle[0]?.attribs["data-src"];
      imgSrc = imgSrc && `${GenmaWebPrefixUrl}${imgSrc}`;

      GenmaList.push({ id: genmaId, name: nameEle.text(), url: `${GenmaWebPrefixUrl}${idHref}`, image: imgSrc });
    });

    saveGenmaListJson();
  });
}

// 存储原魔列表
async function saveGenmaListJson() {
  let path = `${_path}/data/Genma/GenmaList.json`;
  fs.writeFileSync(path, JSON.stringify(GenmaList, "", "\t"));
}

// 存储单个原魔数据，以文件夹的形式存储
async function saveGenmaSingleInfo(genma, genmaData) {
  let path = `${_path}/data/Genma/${genma.name}(${genma.id})`;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  fs.writeFileSync(`${path}/data.json`, JSON.stringify(genmaData, "", "\t"));
}