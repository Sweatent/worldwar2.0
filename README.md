# 世界大战多人策略游戏 - 战斗地图分层渲染与战术视图系统

一款基于 React + PixiJS 的多人策略游戏，实现三层地图渲染系统、单位移动动画、战争迷雾和实时战斗演绎。

## 核心功能

### 1. 三层地图系统 (LayeredMapSystem)
- **战略层 (Strategic)**: 全球视角，显示国家边界、控制区域、主要城市
- **区域层 (Regional)**: 省份细节，显示地形、移动路径
- **战术层 (Tactical)**: 战斗细节，显示单位位置、实时战斗效果
- 无缝缩放切换，带淡入淡出动画

### 2. 单位移动系统 (UnitMovementSystem)
- A*寻路算法，考虑地形影响
- 平滑移动动画（easeInOutQuad）
- 虚线路径显示
- 不同兵种在不同地形的移动成本计算

### 3. 战争迷雾系统 (FogOfWarSystem)
- 三级视野系统：
  - **未探索 (UNEXPLORED)**: 纯黑，完全未知
  - **已探索 (EXPLORED)**: 灰色，历史已知但当前不可见
  - **可见 (VISIBLE)**: 全彩，当前可见
- 基于单位视野范围和控制领土自动更新
- 不同兵种有不同视野范围

### 4. 实时战斗演绎 (BattleVisualization)
- 逐回合战斗动画
- 单位闪烁、震动、伤害数字飞出
- 弹道发射动画
- 爆炸特效

### 5. 多战场管理 (MultipleBattlesManager)
- 同时显示所有活跃战斗
- 点击快速跳转到战场
- 实时进度显示
- Framer Motion 流畅动画

## 性能优化

### 1. 视口裁剪 (Viewport Culling)
```typescript
// 只渲染可见区域的对象
updateVisibleObjects() {
  const bounds = this.viewport.getVisibleBounds()
  for (const child of layer.children) {
    child.visible = boundsIntersect(bounds, child.getBounds())
  }
}
```

### 2. 对象池 (SpritePool)
```typescript
const pool = new SpritePool(256)
const sprite = pool.getSprite(texture) // 复用精灵
pool.returnSprite(sprite) // 归还到池中
```

### 3. 分层缓存
```typescript
// 静态层缓存为位图以提高性能
this.layers.strategic.cacheAsBitmap = true
```

## 技术栈

- **前端框架**: React 18 + TypeScript
- **渲染引擎**: PixiJS 7.3 + pixi-viewport
- **状态管理**: 自定义 useSyncExternalStore
- **动画**: Framer Motion
- **样式**: Tailwind CSS
- **构建工具**: Vite 5

## 项目结构

```
packages/frontend/
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   ├── LayeredMapSystem.tsx    # 三层地图系统
│   │   │   ├── UnitMovementSystem.ts   # 单位移动系统
│   │   │   ├── FogOfWarSystem.ts       # 战争迷雾系统
│   │   │   ├── BattleVisualization.ts  # 战斗可视化
│   │   │   └── MapCanvas.tsx           # 地图容器组件
│   │   └── ui/
│   │       └── MultipleBattlesManager.tsx  # 多战场管理
│   ├── store/
│   │   └── gameStore.ts                # 游戏状态管理
│   ├── types/
│   │   └── game.ts                     # 类型定义
│   ├── utils/
│   │   ├── SpritePool.ts               # 对象池
│   │   ├── culling.ts                  # 视口裁剪
│   │   └── types.ts                    # 工具类型
│   ├── App.tsx                         # 应用主组件
│   ├── main.tsx                        # 应用入口
│   └── styles.css                      # 全局样式
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 开发指南

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 类型检查
```bash
npm run typecheck
```

### 代码检查
```bash
npm run lint
```

## 验收标准

✅ 三层地图无缝切换（战略/区域/战术）  
✅ 单位移动有流畅动画，路径考虑地形  
✅ 战争迷雾三级显示（未探索/已探索/可见）  
✅ 战斗有实时演绎动画  
✅ 多战场可同时管理和快速切换  
✅ 地形影响显示清晰  
✅ 视口裁剪优化，只渲染可见对象  
✅ 对象池复用，减少GC压力  
✅ 静态层缓存，提升渲染性能  

## 性能指标

- **目标帧率**: 
  - PC: 60 FPS
  - 移动端: 30 FPS
- **内存占用**: < 200MB
- **首包大小**: < 5MB
- **地图对象数**: 支持 1000+ 对象同时渲染

## 游戏机制

### 兵种系统
- 步兵、机械化步兵、坦克、炮兵、战斗机、侦察兵、防空炮
- 每种兵种有不同的攻击、防御、速度、视野属性
- 地形修正影响单位表现

### 地形类型
- 平原、山地、森林、沙漠、丛林、水域、城市
- 不同地形影响移动成本和战斗效果

### 战斗系统
- 回合制战斗
- 攻击方和防守方交替攻击
- 伤亡计算基于单位属性和地形
- 最多10回合

## 许可证

MIT License

---

**开发团队**: World War Strategy Game Team  
**版本**: 0.1.0  
**最后更新**: 2024
