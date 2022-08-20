// 适配V3 Yunzai，将index.js移至app/index.js

// ======================================================================
// 本次升级参考miao-plugin，兼容V2以及V3云崽，谢谢喵喵插件的贡献 ^_^
// ======================================================================

import { isV3 } from './components/common.js'
import Data from './components/Data.js'

export * from './apps/index.js'

let index = { baizhi: {} }
if (isV3) {
  index = await Data.importModule('/plugins/zhi-plugin/adapter', 'index.js')
}

export const baizhi = index.baizhi || {}

if (Bot?.logger?.info) {
  Bot.logger.info(`白纸插件初始化~`)
} else {
  console.log(`白纸插件初始化~`)
}