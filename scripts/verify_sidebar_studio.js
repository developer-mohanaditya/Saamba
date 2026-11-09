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

  console.log('Reloading page http://localhost:3001/v2 ...');
  await send('Page.navigate', { url: 'http://localhost:3001/v2' });
  await new Promise(r => setTimeout(r, 2500));

  console.log('Evaluating sidebar structure & layout constraints...');
  const inspection = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const sidebar = document.querySelector('.workspace-sidebar');
      const scrollable = document.querySelector('.sidebar-scrollable-content');
      const meetingList = document.querySelector('.meeting-list');
      const footer = document.querySelector('.sidebar-footer');
      const utilityBar = document.querySelector('.sidebar-utility-bar');
      const userCard = document.querySelector('.sidebar-user-card');
      const planBadge = document.querySelector('.sidebar-plan-badge');

      if (!sidebar) return { error: 'No .workspace-sidebar found' };

      const sidebarStyle = window.getComputedStyle(sidebar);
      const scrollableStyle = scrollable ? window.getComputedStyle(scrollable) : null;
      const meetingListStyle = meetingList ? window.getComputedStyle(meetingList) : null;

      // Try scrolling outer sidebar
      sidebar.scrollTop = 150;
      const sidebarScrollTopAfter = sidebar.scrollTop;

      // Try scrolling inner content
      if (scrollable) {
        scrollable.scrollTop = 50;
      }
      const scrollableScrollTopAfter = scrollable ? scrollable.scrollTop : null;

      return {
        sidebar: {
          width: sidebarStyle.width,
          height: sidebarStyle.height,
          maxHeight: sidebarStyle.maxHeight,
          overflow: sidebarStyle.overflow,
          overflowY: sidebarStyle.overflowY,
          position: sidebarStyle.position,
          canScrollOuter: sidebarScrollTopAfter > 0,
        },
        scrollable: scrollable ? {
          overflowY: scrollableStyle.overflowY,
          scrollHeight: scrollable.scrollHeight,
          clientHeight: scrollable.clientHeight,
        } : null,
        meetingList: meetingList ? {
          overflowY: meetingListStyle.overflowY,
          itemCount: meetingList.querySelectorAll('.meeting').length,
        } : null,
        utilityBar: utilityBar ? {
          buttonCount: utilityBar.querySelectorAll('.utility-icon-btn').length,
        } : null,
        userCard: userCard ? {
          text: userCard.innerText.trim().replace(/\\n+/g, ' '),
          planBadge: planBadge ? planBadge.innerText.trim() : null,
        } : null,
      };
    })()`
  });

  console.log('Inspection result:', JSON.stringify(inspection.value, null, 2));

  // Take screenshot of expanded sidebar
  console.log('Capturing expanded sidebar screenshot...');
  const screenshot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_studio_expanded.png',
    Buffer.from(screenshot1.data, 'base64')
  );

  // Test Collapse
  console.log('Clicking collapse button...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#sidebar-collapse-btn').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  const collapsedInspection = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const sidebar = document.querySelector('.workspace-sidebar');
      const style = window.getComputedStyle(sidebar);
      return {
        width: style.width,
        userCardVisible: !!document.querySelector('.sidebar-user-card'),
        avatarRingVisible: !!document.querySelector('.sidebar-avatar-ring'),
      };
    })()`
  });
  console.log('Collapsed inspection result:', JSON.stringify(collapsedInspection.value, null, 2));

  console.log('Capturing collapsed sidebar screenshot...');
  const screenshot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_studio_collapsed.png',
    Buffer.from(screenshot2.data, 'base64')
  );

  // Restore expanded state
  console.log('Restoring expanded state...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#sidebar-collapse-btn').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('Done!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
