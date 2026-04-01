# 快速启动指南

## 启动游戏

### 方法 1: 使用 Python 服务器（推荐）

```bash
python server.py
```

然后在浏览器中访问: `http://127.0.0.1:8000`

### 方法 2: 直接打开 HTML 文件

直接在浏览器中打开 `index.html` 文件

**注意**: 某些功能（如关卡数据加载）可能需要 HTTP 服务器才能正常工作。

## 测试新功能

### 1. 测试布尔公式关卡（隐藏真值表）

1. 启动游戏
2. 点击底部的 "Level 13" 按钮
3. **预期结果**: 左侧边栏不显示真值表，只显示布尔公式 "A AND (B OR C)"

### 2. 测试输出颜色反转

1. 进入任意关卡（如 Level 1）
2. 点击 INPUT 门切换值
3. **预期结果**: 
   - OUTPUT 门为 0 时显示红色
   - OUTPUT 门为 1 时显示绿色

### 3. 测试连接模式高亮

1. 点击画布上方的 "Connect Mode" 按钮
2. **预期结果**: 
   - 按钮变为亮青色
   - 按钮周围有明显的发光效果
   - 按钮略微放大
   - 按钮有青色边框

### 4. 测试箭头

1. 进入 Level 1
2. 点击 "AND" 按钮添加 AND 门
3. 点击 "Connect Mode"
4. 点击 INPUT A，然后点击 AND 门（创建连接）
5. **预期结果**: 连接线末端有箭头指向 AND 门

### 5. 测试多输入箭头间隔

1. 进入 Level 1
2. 添加一个 AND 门
3. 创建两个连接：INPUT A → AND, INPUT B → AND
4. **预期结果**: 两个箭头到达 AND 门的不同位置（上下间隔）

### 6. 测试逻辑门形状

1. 进入 Level 7（有 AND 和 NOT 门）
2. 添加各种门到画布
3. **预期结果**: 
   - AND 门显示为 D 形状
   - NOT 门显示为三角形 + 小圆圈
   - OR 门显示为弧形
   - NAND/NOR 门有输出端小圆圈
   - XOR 门有额外的输入弧线

## 常见问题

### Q: 真值表没有隐藏？
A: 确保你在布尔公式关卡（Level 13-15）。其他关卡仍会显示真值表。

### Q: 逻辑门形状看起来不对？
A: 刷新浏览器页面，清除缓存（Ctrl+Shift+R 或 Cmd+Shift+R）。

### Q: 连接模式按钮没有高亮？
A: 检查 styles.css 是否正确加载。打开浏览器开发者工具查看是否有 CSS 错误。

### Q: 箭头没有显示？
A: 确保 game.js 已更新。检查浏览器控制台是否有 JavaScript 错误。

## 开发者工具

按 F12 打开浏览器开发者工具：
- **Console**: 查看 JavaScript 错误
- **Network**: 检查文件加载情况
- **Elements**: 检查 HTML/CSS

## 性能监控

在控制台输入以下命令查看 FPS：

```javascript
let lastTime = performance.now();
let frames = 0;
setInterval(() => {
    const now = performance.now();
    const fps = frames / ((now - lastTime) / 1000);
    console.log(`FPS: ${fps.toFixed(1)}`);
    frames = 0;
    lastTime = now;
}, 1000);
requestAnimationFrame(function count() {
    frames++;
    requestAnimationFrame(count);
});
```

预期 FPS: 55-60

## 反馈

如果发现任何问题，请检查：
1. 浏览器控制台的错误信息
2. game.js 和 styles.css 是否正确更新
3. 浏览器是否支持 Canvas 2D API
