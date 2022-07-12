// npm i cheerio superagent -D

import fs from "fs";
import cheerio from "cheerio";
import superagent from "superagent";
import common from "../components/common.js";

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

/**
 * 多语言
 * CHS简中、CHT繁中、DE德语、EN英语、ES西班牙语、FR法语、ID印尼语、JA日语、KO韩语、PT葡萄牙语、RU俄语、TH泰语、VI越南语
 */
const i18nList = [
  { CHT: "繁中" },
  { DE: "德语" },
  { EN: "英语" },
  { ES: "西班牙语" },
  { FR: "法语" },
  { ID: "印尼语" },
  { JA: "日语" },
  { KO: "韩语" },
  { PT: "葡萄牙语" },
  { RU: "俄语" },
  { TH: "泰语" },
  { VI: "越南语" },
];
// 内鬼网地址
const GenmaUrl = "https://genshin.honeyhunterworld.com/db/enemy/?lang=";
const GenmaWebPrefixUrl = "https://genshin.honeyhunterworld.com";

// https://github.com/dvaJi/genshin-data
const GithubGenshinDataUrl = "https://genshin-impact.fandom.com/wiki/";

let GenmaList = []; // 原魔列表

const _path = process.cwd();
if (!fs.existsSync(`${_path}/data/Genma/`)) {
  fs.mkdirSync(`${_path}/data/Genma/`);
}

// 获取原魔列表
async function getGenmaList() {
  if (fs.existsSync(`${_path}/data/Genma/GenmaList.json`)) {
    GenmaList = JSON.parse(fs.readFileSync(`${_path}/data/Genma/GenmaList.json`, "utf8"));
    initGenmaListFullImage();
    i18nGenmaList();
  } else {
    initGenmaList();
  }
}

getGenmaList();

export async function test() {
  for (let genma of GenmaList) {
    superagent.get(genma.image, (err, res) => {
      if (err) {
        console.log("\n====================== face req err");
        console.log(genma.name);
        return true;
      }

      let path = `${_path}/data/Genma/${genma.name}(${genma.id})`;
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
      }

      fs.writeFileSync(`${path}/face.png`, res.body, "binary", (err) => {
        if (err) {
          console.log("\n====================== face download err");
          console.log(genma.name);
        }
      });
    });
    await common.sleep(1000);
    if (genma.fullImage) {
      superagent.get(genma.fullImage, (err, res) => {
        if (err) {
          console.log("\n====================== fullImage req err");
          console.log(genma.name);
          return true;
        }

        let path = `${_path}/data/Genma/${genma.name}(${genma.id})`;
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path);
        }

        fs.writeFileSync(`${path}/fullImage.png`, res.body, "binary", (err) => {
          if (err) {
            console.log("\n====================== fullImage download err");
            console.log(genma.name);
          }
        });
      });
    }
    await common.sleep(2000);
  }

  console.log("\n================================");
  console.log("原魔图片下载完成");
  console.log("================================\n");
}

// 拉取单个原魔数据
async function getSingleGenmaData(idx) {
  let genma = GenmaList[idx];

  superagent.get(genma.url, (err, res) => {
    if (err) {
      Bot.logger.mark(err);
      return true;
    }

    const $ = cheerio.load(res.text);
    let genmaData = {}; // 原魔数据对象
    genmaData.name = $(".custom_title").text();
    genmaData.family = $(".item_main_table").eq(0).find("tr").eq(0).find("td").eq(2).text();
    genmaData.description = $(".item_main_table").eq(0).find("tr").eq(3).find("td").eq(1).html();

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
        $tagEle.each(function () {
          let tag = $(this).find("tr").eq(1).find("td").text();
          tagSet.add(tag);
        });
      }
      let tags = [...tagSet].join(",");
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
  const dropInfoList = $(".asc_amount");
  let drops = []; // 掉落物品列表

  dropInfoList.each(function () {
    let $prev = $(this).prev();
    if ($prev.attr("class") != "itempic_cont lazy") return;

    let name = $(this).text().trim();
    let star = "";
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

// 抗性数据对应关系
const ShieldInfoMapping = [
  "hp",
  "atk",
  "def",
  "shield",
  "pyroShield",
  "dendroShield",
  "hydroShield",
  "electroShield",
  "anemoShield",
  "cyroShield",
  "geoShield",
];
// 提取原魔抗性等数据  <- 建立在原魔信息页面
function getGenmaShieldInfoFromGenmaPage($, $statEle, info) {
  let shieldInfo = $statEle.eq(3).find("td");
  shieldInfo.each(function (idx) {
    info[ShieldInfoMapping[idx]] = $(this).text();
  });
}

// 提取原魔等级数据  <- 建立在原魔信息页面
function getGenmaLevelInfoFromGenmaPage($, $levelListEle) {
  let levelInfo = []; // 连带着表头一起，提取全部的等级数据，这就相当于一个table啦
  $levelListEle.each(function (idx) {
    levelInfo[idx] = [];
    $(this)
      .find("td")
      .each(function () {
        levelInfo[idx].push($(this).text());
      });
  });

  return levelInfo;
}

// 初始化原魔列表
async function initGenmaList() {
  const IdReg = /m_\d*/g;

  let url_chs = GenmaUrl + "CHS"; // 中文版

  superagent.get(url_chs, (err, res) => {
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
    console.log("开始拉取原魔数据多语言...");
    i18nGenmaList();
  });
}

// 初始化原魔数据多语言
async function i18nGenmaList() {
  for (let lan of i18nList) {
    let url = GenmaUrl + lan;

    // 已经有了的语言就直接跳过吧
    let isExist = false;
    for (let key in GenmaList[0]) {
      if (key.indexOf(lan) > -1) {
        isExist = true;
        break;
      }
    }
    if (isExist) {
      continue;
    }

    superagent.get(url, (err, res) => {
      if (err) {
        Bot.logger.mark(err);
        return true;
      }

      const $ = cheerio.load(res.text);
      let genmaEleList = $(".char_sea_cont.enemy_sea_cont");

      genmaEleList.each(function (idx) {
        let nameEle = $(this).children().find("span.sea_charname");
        GenmaList[idx][`name_${lan}`] = nameEle.text();
      });

      saveGenmaListJson();

      if (lan === "EN") {
        console.log("开始拉取原魔全身照...");
        initGenmaListFullImage();
      }
    });

    await common.sleep(3000);
  }

  console.log("原魔数据多语言拉取完成");
}

// 原魔全身照
async function initGenmaListFullImage() {
  // 没有英文的话查不了GenshinData
  if (!GenmaList[0].name_EN) return;

  for (let genma of GenmaList) {
    let name_EN = genma.name_EN.split(" ").join("_");
    let url = GithubGenshinDataUrl + name_EN;

    if (genma.fullImage) continue;

    superagent.get(url, (err, res) => {
      if (err) {
        return true;
      }

      const $ = cheerio.load(res.text);

      let $fullImageList = $(".pi-image-thumbnail");
      // 只有一张，那就是你了
      if ($fullImageList.length === 1) {
        genma.fullImage = $fullImageList.attr("src")?.split("?")[0];
        return;
      }

      let validImages = [];
      $fullImageList.each(function () {
        let imgUrl = $(this).attr("src")?.split("?")[0];
        // 不要头像
        if (imgUrl && imgUrl.indexOf("Icon") === -1) {
          validImages.push(imgUrl);
        }
      });

      // 过滤完只剩一张，那就是你了
      if (validImages.length === 1) {
        genma.fullImage = validImages[0];
        return;
      }

      let trueImg = "";
      for (let img of validImages) {
        if (img.indexOf(name_EN) > -1) {
          trueImg = img;
          break;
        }
      }

      if (trueImg) {
        genma.fullImage = trueImg;
        return;
      }

      if (validImages.length) {
        genma.fullImage = validImages[validImages.length - 1];
        return;
      }
    });

    await common.sleep(5000);
  }

  saveGenmaListJson();
  console.log("原魔全身照拉取完成");
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
