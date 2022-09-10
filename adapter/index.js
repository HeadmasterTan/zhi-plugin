import plugin from '../../../lib/plugins/plugin.js'
import * as BaiZhi from '../apps/index.js'
import { render } from './render.js'

export class baizhi extends plugin {
  constructor () {
    let rule = {
      reg: '.+',
      fnc: 'dispatch'
    }
    super({
      name: 'zhi-plugin',
      desc: '白纸插件',
      event: 'message',
      priority: 50,
      rule: [rule]
    })
    Object.defineProperty(rule, 'log', {
      get: () => !!this.isDispatch
    })
  }

  async dispatch (e) {
    let msg = e.original_msg || 'not original_msg'
    if (!msg) {
      return false
    }
    msg = msg.replace('#', '').trim()
    msg = '#' + msg
    for (let fn in BaiZhi.rule) {
      let cfg = BaiZhi.rule[fn]
      if (BaiZhi[fn] && new RegExp(cfg.reg).test(msg)) {
        let ret = await BaiZhi[fn](e, {
          render
        })
        if (ret === true) {
          this.isDispatch = true
          return true
        }
      }
    }
    return false
  }
}
