# Web Piano · Play with Keyboard

纯前端网页钢琴：Vite + TypeScript + 原生 DOM + Web Audio API 合成音色，无任何运行时依赖、无后端。

## 功能

- 鼠标 / 触摸点击琴键发声，按住保持、松开平滑衰减（ADSR 包络）
- 电脑键盘弹奏（A S D F G H J K L ; ' 白键，W E T Y U O P ] 黑键），支持和弦
- 音量调节、Sustain 延音、八度切换（-2 ~ +2）、Stop All
- 录制 / 回放 / 清空，回放时琴键同步高亮
- 当前播放音符实时显示
- 移动端横向滚动 + 多点触摸

## 本地开发

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 类型检查 + 构建到 dist/
npm run preview  # 预览构建产物
```

## 部署到 Cloudflare Pages

1. 将项目推送到 GitHub / GitLab 仓库。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库，构建配置：
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 保存并部署即可。

也可以用 Wrangler 直接上传：

```bash
npm run build
npx wrangler pages deploy dist
```

Vercel / Netlify 同理：构建命令 `npm run build`，输出目录 `dist`。

## 项目结构

```
src/
  main.ts                # 入口：组装页面、键盘输入、模块间接线
  styles.css             # 深色 + 玻璃拟态样式
  audio/
    PianoEngine.ts       # Web Audio 合成引擎（oscillator 叠加泛音 + ADSR）
    envelope.ts          # ADSR 包络工具
    notes.ts             # 音符名 / MIDI / 频率换算
  piano/
    PianoKeyboard.ts     # 琴键渲染与 pointer 事件
    keyMap.ts            # 电脑键盘映射与琴键定义
    types.ts             # 共享类型
  recorder/
    Recorder.ts          # 录制与回放
  ui/
    controls.ts          # 控制面板
  utils/
    dom.ts, time.ts      # 工具函数
```

## TODO（后续扩展）

- [ ] 扩展到 3 个八度
- [ ] 可选加载真实钢琴采样（fallback 到合成音色）
- [ ] 录制内容导出 / 导入 JSON
