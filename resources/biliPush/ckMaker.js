const o = function (t, e) {
  var n = "";
  if (t.length < e) for (var r = 0; r < e - t.length; r++) n += "0";
  return n + t;
};
const randomHex = function (t) {
  for (var e = "", n = 0; n < t; n++) e += numToHex(16 * Math.random());
  return o(e, t);
};
const numToHex = function (t) {
  return Math.ceil(t).toString(16).toUpperCase();
};
const splitDate = function (t) {
  void 0 === t && (t = Date.now());
  var e = new Date(t),
    n = e.getDate(),
    r = e.getHours(),
    o = e.getMinutes(),
    i = e.getTime();
  return {
    day: n,
    hour: r,
    minute: o,
    second: Math.floor(i / 1e3),
    millisecond: i,
  };
};

// 提取 _uuid
export const getUuid = function () {
  const r = randomHex;
  const UUID = (
    r(8) +
    "-" +
    r(4) +
    "-" +
    r(4) +
    "-" +
    r(4) +
    "-" +
    r(12) +
    o(String(Date.now() % 1e5), 5) +
    "infoc"
  )
  return `_uuid=${UUID}`;
};
// 提取 b_lsid
export const getBLsid = () => {
  const TIME = splitDate(),
    HEX = numToHex(TIME.millisecond),
    BLSID = randomHex(8) + "_" + HEX;

  return `b_lsid=${BLSID}`;
};
