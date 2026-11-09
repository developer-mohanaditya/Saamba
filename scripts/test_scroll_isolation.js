const fs = require('fs');

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4CA79C727DDD9105A24D65C26A93D658');
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === curId) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.onopen = r);

  // Set viewport height to 720px to test constrained vertical height
  console.log('Setting viewport to 1280x720 to simulate constrained display...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('Attempting to scroll the outer sidebar container...');
  const outerScrollResult = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const sidebar = document.querySelector('.workspace-sidebar');
      sidebar.scrollTop = 100;
      return {
        sidebarHeight: sidebar.clientHeight,
        sidebarScrollHeight: sidebar.scrollHeight,
        sidebarScrollTop: sidebar.scrollTop,
        isOuterLocked: sidebar.scrollTop === 0
      };
    })()`
  });
  console.log('Outer sidebar scroll test:', outerScrollResult.result.value);

  console.log('Now scrolling the inner content region...');
  const innerScrollResult = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const scrollable = document.querySelector('.sidebar-scrollable-content');
      const meetingList = document.querySelector('.meeting-list');
      if (scrollable) {
        scrollable.scrollTop = 60;
      }
      if (meetingList) {
        meetingList.scrollTop = 80;
      }
      return {
        scrollableScrollTop: scrollable ? scrollable.scrollTop : null,
        meetingListScrollTop: meetingList ? meetingList.scrollTop : null,
        headerPinned: document.querySelector('.sidebar-top').getBoundingClientRect().top === 0,
        footerPinned: Math.round(document.querySelector('.sidebar-footer').getBoundingClientRect().bottom) === 720
      };
    })()`
  });
  console.log('Inner elements scroll test:', innerScrollResult.result.value);

  // Capture screenshot under 720px height
  console.log('Capturing screenshot of scroll-isolated sidebar at 720px height...');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_scroll_isolated_720p.png',
    Buffer.from(screenshot.data, 'base64')
  );

  // Reset viewport override
  await send('Emulation.clearDeviceMetricsOverride');
  console.log('Device metrics restored. Test complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
