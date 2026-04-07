/**
 * OMMO Captcha Solver — dựa theo extension GSTI (SliderAllWebTask)
 */
import dotenv from 'dotenv';
dotenv.config();

const OMMO_API = 'https://api.omocaptcha.com/v2';

function getOmmoKey(): string {
  return process.env.OMMO_CAPTCHA_KEY || '';
}

/** Tìm frame chứa captcha (có thể là iframe hoặc main page) */
async function getCaptchaFrame(page: any): Promise<any> {
  for (const frame of page.frames()) {
    try {
      const has = await frame.evaluate(`
        (function() {
          var text = document.body.innerText || '';
          return text.indexOf('Kéo mảnh ghép') >= 0
            || text.indexOf('Xác minh để tiếp tục') >= 0
            || text.indexOf('Drag the puzzle') >= 0
            || !!document.querySelector('[class*="captcha"] img, [id*="captcha"] img, canvas');
        })()
      `).catch(() => false);
      if (has) {
        console.log(`  📌 Captcha trong frame: ${frame.url().slice(0, 80)}`);
        return frame;
      }
    } catch {}
  }
  return page;
}

/** Detect captcha — trả loại: 'slider' | '3dselect' | false */
export async function detectCaptcha(page: any): Promise<string | false> {
  const checkScript = `
    (function() {
      var text = document.body.innerText || '';
      if (text.indexOf('Chọn 2 đối tượng') >= 0 || text.indexOf('Select 2 objects') >= 0)
        return '3dselect';
      if (text.indexOf('Kéo mảnh ghép') >= 0 || text.indexOf('Xác minh để tiếp tục') >= 0 || text.indexOf('Drag the puzzle') >= 0)
        return 'slider';
      return '';
    })()
  `;
  const mainType = await page.evaluate(checkScript).catch(() => '');
  if (mainType) return mainType;
  for (const frame of page.frames()) {
    const type = await frame.evaluate(checkScript).catch(() => '');
    if (type) return type;
  }
  return false;
}

export async function solveCaptchaIfPresent(page: any): Promise<boolean> {
  const key = getOmmoKey();

  for (let retry = 0; retry < 5; retry++) {
    const captchaType = await detectCaptcha(page);
    if (!captchaType) return true;

    console.log(`  🧩 Captcha detected: ${captchaType} (lần ${retry + 1})...`);

    if (!key) {
      console.log('  ⚠️ OMMO_CAPTCHA_KEY chưa set. Đợi 30s giải thủ công...');
      await page.waitForTimeout(30000);
      if (!(await detectCaptcha(page))) return true;
      continue;
    }

    try {
      const captchaFrame = await getCaptchaFrame(page);
      let solved = false;
      if (captchaType === '3dselect') {
        solved = await solve3DSelect(page, captchaFrame, key);
      } else {
        solved = await solveCaptcha(page, captchaFrame, key);
      }
      if (solved) {
        console.log('  ✅ Captcha solved!');
        await page.waitForTimeout(2000);
        if (!(await detectCaptcha(page))) return true;
      }
    } catch (err: any) {
      console.log(`  ❌ Lỗi: ${err.message}`);
    }

    // Refresh captcha image (click "Làm mới" hoặc refresh icon)
    for (const target of [page, ...page.frames()]) {
      await target.evaluate(`
        (function() {
          var btns = document.querySelectorAll('svg, div, span, button, a');
          for (var b of btns) {
            var text = b.textContent || '';
            var cls = (b.className || '').toString();
            if (cls.indexOf('refresh') >= 0 || cls.indexOf('reload') >= 0 || text.indexOf('Làm mới') >= 0) {
              b.click(); return;
            }
          }
        })()
      `).catch(() => {});
    }
    await page.waitForTimeout(3000);
  }

  return false;
}

async function solveCaptcha(page: any, frame: any, apiKey: string): Promise<boolean> {
  const fs = await import('fs');
  const path = await import('path');

  // 1. Lấy thông tin captcha từ DOM
  const captchaInfo = await frame.evaluate(`
    (function() {
      var result = {};
      // Puzzle image
      var imgs = document.querySelectorAll('img');
      for (var i of imgs) {
        var r = i.getBoundingClientRect();
        if (r.width > 200 && r.width < 500 && r.height > 100 && r.height < 400 && r.top > 50 && r.top < 600) {
          result.img = { src: i.src, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
          break;
        }
      }
      // Slider handle
      var handle = document.querySelector('.secsdk-captcha-drag-icon');
      var handleRect = handle ? handle.getBoundingClientRect() : null;
      result.handle = handleRect ? { x: Math.round(handleRect.left + handleRect.width/2), y: Math.round(handleRect.top + handleRect.height/2) } : null;
      return result;
    })()
  `);

  if (!captchaInfo?.img) throw new Error('captcha.puzzleImageNotFound');
  if (!captchaInfo?.handle) throw new Error('captcha.sliderHandleNotFound');

  const imgRect = captchaInfo.img;

  // 2. Fetch ảnh puzzle trực tiếp từ URL (tránh DPR/screenshot issues)
  console.log(`  📸 Fetch puzzle image: ${imgRect.src?.slice(0, 60)}...`);
  let base64 = '';
  try {
    const imgRes = await fetch(imgRect.src);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    base64 = imgBuf.toString('base64');
    console.log(`  ✅ Fetch OK: ${imgBuf.length} bytes`);
  } catch (e: any) {
    console.log(`  ⚠️ Fetch failed: ${e.message}, fallback screenshot`);
    const fullBuf = await page.screenshot({ type: 'png', fullPage: false });
    base64 = fullBuf.toString('base64');
  }

  fs.writeFileSync(path.resolve(__dirname, '..', 'logs', 'captcha-debug.png'), Buffer.from(base64, 'base64'));
  console.log(`  Puzzle: (${imgRect.x},${imgRect.y}) ${imgRect.w}x${imgRect.h}`);

  // 2. Gửi OMMO — dùng SliderAllWebTask với kích thước puzzle image
  console.log('  Gửi OMMO SliderAllWebTask...');
  let endX = 0;
  let taskType = 'SliderAllWebTask';

  let createData = await createOmmoTask(apiKey, base64, imgRect.w, imgRect.h, 'SliderAllWebTask');

  // Nếu SliderAllWebTask fail, thử TiktokSliderWebTask
  if (createData.errorId !== 0) {
    console.log(`  SliderAllWebTask lỗi: ${createData.errorDescription}, thử TiktokSliderWebTask...`);
    taskType = 'TiktokSliderWebTask';
    createData = await createOmmoTask(apiKey, base64, imgRect.w, imgRect.h, 'TiktokSliderWebTask');
  }

  if (createData.errorId !== 0) {
    throw new Error(`OMMO: ${createData.errorDescription || createData.errorCode}`);
  }

  console.log(`  TaskId: ${createData.taskId} (${taskType})`);

  // Poll kết quả
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const resultRes = await fetch(`${OMMO_API}/getTaskResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey, taskId: createData.taskId }),
    });
    const rd = await resultRes.json() as any;

    if (rd.status === 'ready') {
      console.log(`  Raw solution: ${JSON.stringify(rd.solution)}`);
      // Extension dùng rects[0].x, cũ dùng end.x — hỗ trợ cả hai
      endX = rd.solution?.rects?.[0]?.x || rd.solution?.end?.x || 0;
      console.log(`  ✅ Solved: x = ${endX}`);
      break;
    }
    if (rd.status === 'fail' || rd.status === 'failed') {
      console.log(`  ❌ OMMO fail: ${rd.errorDescription || 'Job failed'}`);
      break;
    }
  }

  if (endX <= 0) throw new Error(`captcha.ommoInvalidResult: x=${endX}`);

  // 3. Tính khoảng cách kéo
  // Gửi ảnh puzzle gốc → OMMO trả rects.x = vị trí trên ảnh gốc
  // Scale về kích thước hiển thị: rects.x * (displayWidth / naturalWidth)
  // Nhưng nếu gửi widthView = displayWidth thì OMMO đã scale sẵn
  const dragDistance = endX;
  const slider = captchaInfo.handle;

  console.log(`  OMMO x=${endX} = drag=${dragDistance}px, slider=(${slider.x},${slider.y})`);

  if (dragDistance < 5 || dragDistance > 500) throw new Error(`captcha.invalidDragDistance: ${dragDistance}px`);

  // Kéo slider bằng dispatchEvent trên DOM (giống extension, tránh bị block bởi overlay)
  console.log('  🖱️ Kéo slider bằng DOM events...');
  await frame.evaluate(`
    (function() {
      var handle = document.querySelector('.secsdk-captcha-drag-icon');
      if (!handle) return;
      var rect = handle.getBoundingClientRect();
      var startX = rect.left + rect.width / 2;
      var startY = rect.top + rect.height / 2;
      var slideDistance = ${dragDistance};

      // mousedown
      handle.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, clientX: startX, clientY: startY, view: window
      }));

      // mousemove in steps
      var steps = 30;
      var delay = 0;
      for (var i = 1; i <= steps; i++) {
        (function(step) {
          delay += 15 + Math.random() * 15;
          setTimeout(function() {
            var progress = step / steps;
            var eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            var currentX = startX + slideDistance * eased;
            var wobbleY = startY + (Math.random() * 3 - 1.5);
            document.dispatchEvent(new MouseEvent('mousemove', {
              bubbles: true, cancelable: true, clientX: currentX, clientY: wobbleY, view: window
            }));
          }, delay);
        })(i);
      }

      // mouseup after all moves + 5s hold
      setTimeout(function() {
        document.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true, cancelable: true, clientX: startX + slideDistance, clientY: startY, view: window
        }));
      }, delay + 5000);
    })()
  `);

  // Đợi animation hoàn tất (steps ~600ms + hold 5s + buffer)
  console.log('  ⏳ Đợi kéo xong (6s)...');
  await page.waitForTimeout(7000);

  return !(await detectCaptcha(page));
}

/**
 * Giải captcha 3D Select Object — "Chọn 2 đối tượng có hình dạng giống nhau"
 * OMMO API: Tiktok3DSelectObjectWebTask → trả pointA + pointB
 */
async function solve3DSelect(page: any, frame: any, apiKey: string): Promise<boolean> {
  const fs = await import('fs');
  const pathMod = await import('path');

  // 1. Tìm captcha image — ưu tiên img có class chứa "cap-" (captcha widget)
  const imgInfo = await frame.evaluate(`
    (function() {
      var imgs = document.querySelectorAll('img');
      var candidates = [];
      for (var img of imgs) {
        var rect = img.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 80 || rect.width > 600 || rect.height > 500) continue;
        if (rect.top < 20 || rect.top > 800) continue;
        var cls = (img.className || '').toString().toLowerCase();
        var src = img.src || '';
        var score = 0;
        // Ưu tiên cao: class chứa "cap-" (captcha widget)
        if (cls.indexOf('cap-') >= 0 || cls.indexOf('captcha') >= 0) score += 100;
        // Ưu tiên cao: src từ captcha CDN
        if (src.indexOf('captcha') >= 0 || src.indexOf('rc-captcha') >= 0) score += 80;
        // Ưu tiên: không phải ảnh quá vuông (3D captcha thường là landscape)
        var ratio = rect.width / rect.height;
        if (ratio > 1.2 && ratio < 2.5) score += 30;
        // Ưu tiên: kích thước hợp lý cho captcha
        if (rect.width >= 280 && rect.width <= 400 && rect.height >= 150 && rect.height <= 300) score += 20;
        if (score > 0 || (rect.width > 200 && rect.height > 100)) {
          candidates.push({ src: img.src, x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height), score: score });
        }
      }
      // Sắp xếp theo score giảm dần
      candidates.sort(function(a, b) { return b.score - a.score; });
      return candidates.length > 0 ? candidates[0] : null;
    })()
  `);

  if (!imgInfo) throw new Error('captcha.imageNotFound');
  console.log(`  📸 3D captcha: (${imgInfo.x},${imgInfo.y}) ${imgInfo.w}x${imgInfo.h}`);

  // 2. Fetch ảnh trực tiếp từ URL
  let base64 = '';
  try {
    const imgRes = await fetch(imgInfo.src);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    base64 = imgBuf.toString('base64');
    console.log(`  ✅ Fetch OK: ${imgBuf.length} bytes`);
    fs.writeFileSync(pathMod.resolve(__dirname, '..', 'logs', 'captcha-3d-debug.png'), imgBuf);
  } catch (e: any) {
    throw new Error('captcha.imageFetchFailed: ' + e.message);
  }

  // 3. Gửi OMMO — Tiktok3DSelectObjectWebTask
  console.log('  Gửi OMMO Tiktok3DSelectObjectWebTask...');
  const createData = await createOmmoTask(apiKey, base64, imgInfo.w, imgInfo.h, 'Tiktok3DSelectObjectWebTask');

  if (createData.errorId !== 0) {
    throw new Error(`OMMO: ${createData.errorDescription || createData.errorCode}`);
  }
  console.log(`  TaskId: ${createData.taskId}`);

  // 4. Poll kết quả
  let pointA: { x: number; y: number } | null = null;
  let pointB: { x: number; y: number } | null = null;

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const resultRes = await fetch(`${OMMO_API}/getTaskResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey, taskId: createData.taskId }),
    });
    const rd = await resultRes.json() as any;

    if (rd.status === 'ready') {
      console.log(`  Raw solution: ${JSON.stringify(rd.solution)}`);
      pointA = rd.solution?.pointA;
      pointB = rd.solution?.pointB;
      break;
    }
    if (rd.status === 'fail' || rd.status === 'failed') {
      console.log(`  ❌ OMMO fail: ${rd.errorDescription || 'Job failed'}`);
      break;
    }
  }

  if (!pointA || !pointB) throw new Error('captcha.ommoPointsNotReturned');
  console.log(`  ✅ pointA=(${pointA.x},${pointA.y}), pointB=(${pointB.x},${pointB.y})`);

  // 5. Click 2 điểm trên captcha image bằng DOM events (tránh page.mouse.click bị block bởi overlay)
  // pointA/B là tọa độ trên ảnh (widthView x heightView) → chuyển sang tọa độ viewport
  const clickX1 = imgInfo.x + pointA.x;
  const clickY1 = imgInfo.y + pointA.y;
  const clickX2 = imgInfo.x + pointB.x;
  const clickY2 = imgInfo.y + pointB.y;

  console.log(`  🖱️ Click 1: (${clickX1},${clickY1})`);
  console.log(`  🖱️ Click 2: (${clickX2},${clickY2})`);

  await frame.evaluate(`
    (function() {
      function simulateClick(x, y) {
        var el = document.elementFromPoint(x, y);
        if (!el) return;
        var events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (var i = 0; i < events.length; i++) {
          var evt = new PointerEvent(events[i], {
            bubbles: true, cancelable: true, composed: true,
            clientX: x, clientY: y, view: window,
            pointerId: 1, pointerType: 'mouse', button: 0, buttons: events[i].includes('down') ? 1 : 0
          });
          el.dispatchEvent(evt);
        }
      }
      // Click point A
      simulateClick(${clickX1}, ${clickY1});
      // Click point B sau 800ms
      setTimeout(function() {
        simulateClick(${clickX2}, ${clickY2});
      }, 800);
    })()
  `);
  await page.waitForTimeout(2000);

  // 6. Bấm "Xác nhận" — tìm đúng nút trong captcha widget (class chứa "cap-")
  console.log('  Bấm Xác nhận...');
  const allTargets = [frame, page, ...page.frames()];
  let confirmClicked = false;
  for (const target of allTargets) {
    try {
      const clicked = await target.evaluate(`
        (function() {
          // Ưu tiên 1: Tìm nút có class chứa "cap-" (captcha widget)
          var all = document.querySelectorAll('button, div, span, a');
          for (var b of all) {
            var text = b.textContent.trim();
            var cls = (b.className || '').toString().toLowerCase();
            if ((text === 'Xác nhận' || text === 'Confirm' || text === 'Submit') && cls.indexOf('cap-') >= 0) {
              b.click();
              return 'captcha-btn: ' + b.tagName + '.' + cls.slice(0, 50);
            }
          }
          // Ưu tiên 2: Tìm nút bên trong container có class "cap-"
          var capContainers = document.querySelectorAll('[class*="cap-"]');
          for (var container of capContainers) {
            var btns = container.querySelectorAll('button, div, span, a');
            for (var b of btns) {
              var text = b.textContent.trim();
              if (text === 'Xác nhận' || text === 'Confirm' || text === 'Submit') {
                b.click();
                return 'cap-child: ' + b.tagName + '.' + (b.className || '').toString().slice(0, 50);
              }
            }
          }
          return '';
        })()
      `).catch(() => '');
      if (clicked) {
        console.log(`  ✅ ${clicked}`);
        confirmClicked = true;
        break;
      }
    } catch {}
  }

  // Fallback: click bằng tọa độ vào vị trí nút Xác nhận (ngay dưới ảnh captcha)
  if (!confirmClicked) {
    console.log('  ⚠️ Không tìm được nút captcha, click bằng tọa độ...');
    const btnX = imgInfo.x + imgInfo.w / 2;
    const btnY = imgInfo.y + imgInfo.h + 40;
    console.log(`  Click tọa độ: (${btnX}, ${btnY})`);
    await frame.evaluate(`
      (function() {
        var el = document.elementFromPoint(${btnX}, ${btnY});
        if (el) {
          console.log('Fallback click:', el.tagName, el.className);
          el.click();
        }
      })()
    `).catch(() => {});
  }

  await page.waitForTimeout(3000);

  return !(await detectCaptcha(page));
}

async function createOmmoTask(apiKey: string, base64: string, width: number, height: number, type: string) {
  const res = await fetch(`${OMMO_API}/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: apiKey,
      task: {
        type,
        imageBase64: base64,
        widthView: width,
        heightView: height,
      },
    }),
  });
  return res.json() as any;
}

async function findSlider(frame: any): Promise<{ x: number; y: number } | null> {
  return frame.evaluate(`
    (function() {
      var all = document.querySelectorAll('div, button, span, a');
      var candidates = [];
      for (var el of all) {
        var rect = el.getBoundingClientRect();
        if (rect.width < 20 || rect.width > 100 || rect.height < 20 || rect.height > 80) continue;
        if (rect.top < 200 || rect.top > 700) continue;
        var cls = (el.className || '').toString().toLowerCase();
        var id = (el.id || '').toLowerCase();
        var style = window.getComputedStyle(el);
        var hasSvgOrImg = !!el.querySelector('svg, img');
        var isSlider = cls.match(/slide|drag|btn|handle|arrow|secsdk|captcha|verify/)
                    || id.match(/slide|drag|handle|captcha/)
                    || hasSvgOrImg;
        var isCursorPointer = style.cursor === 'pointer' || style.cursor === 'grab' || style.cursor === 'move';
        if (isSlider || isCursorPointer) {
          candidates.push({
            x: Math.round(rect.left + rect.width/2),
            y: Math.round(rect.top + rect.height/2),
            w: rect.width, h: rect.height,
            score: (isSlider ? 10 : 0) + (isCursorPointer ? 5 : 0) + (hasSvgOrImg ? 3 : 0)
          });
        }
      }
      if (candidates.length > 0) {
        // Ưu tiên score cao nhất, nếu bằng thì chọn bên trái nhất
        candidates.sort(function(a,b) { return b.score - a.score || a.x - b.x; });
        console.log('Slider candidates:', JSON.stringify(candidates.slice(0,3)));
        return { x: candidates[0].x, y: candidates[0].y };
      }
      return null;
    })()
  `);
}
