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

  console.log('Navigating to http://localhost:3001/v2 ...');
  await send('Page.navigate', { url: 'http://localhost:3001/v2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Test guest auth modal
  console.log('Clearing storage to test guest auth modal...');
  await send('Runtime.evaluate', { expression: 'localStorage.clear(); sessionStorage.clear(); window.location.reload();' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Opening auth modal...');
  await send('Runtime.evaluate', { expression: "document.querySelector('#sidebar-signin-btn').click()" });
  await new Promise(r => setTimeout(r, 800));

  const authShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/auth_modal_with_backdrop.png', Buffer.from(authShot.data, 'base64'));
  console.log('Auth modal screenshot captured.');

  // Check close button
  await send('Runtime.evaluate', { expression: "document.querySelector('#close-auth-dialog').click()" });
  await new Promise(r => setTimeout(r, 500));

  // 2. Reopen and Log In
  console.log('Reopening and logging in...');
  await send('Runtime.evaluate', { expression: "document.querySelector('#sidebar-signin-btn').click()" });
  await new Promise(r => setTimeout(r, 600));

  await send('Runtime.evaluate', { expression: "(() => { const el = document.querySelector('#auth-email-input'); el.value = ''; el.focus(); })()" });
  await send('Input.insertText', { text: 'mohan.founder@profeshare.ai' });
  await new Promise(r => setTimeout(r, 200));

  await send('Runtime.evaluate', { expression: "(() => { const el = document.querySelector('#auth-password-input'); el.value = ''; el.focus(); })()" });
  await send('Input.insertText', { text: 'Password123!Secure' });
  await new Promise(r => setTimeout(r, 300));

  await send('Runtime.evaluate', { expression: "document.querySelector('#auth-form button[type=submit]').click()" });
  await new Promise(r => setTimeout(r, 3500));

  // Verify Workspaces (My meetings + Class)
  const checkState = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const wsBlocks = Array.from(document.querySelectorAll('.workspace-block')).map(b => ({
        id: b.getAttribute('data-workspace-id'),
        title: b.querySelector('.workspace-title')?.innerText,
        count: b.querySelector('.workspace-count')?.innerText,
        isActive: b.classList.contains('is-active')
      }));
      const meetings = document.querySelectorAll('.meeting');
      const meetingIcons = Array.from(document.querySelectorAll('.meeting-icon')).map(i => ({
        bg: window.getComputedStyle(i).backgroundColor,
        color: window.getComputedStyle(i).color
      }));
      const avatarRing = document.querySelector('.sidebar-avatar-ring');
      const avatarStyle = avatarRing ? window.getComputedStyle(avatarRing) : null;
      return {
        wsBlocks,
        meetingCount: meetings.length,
        firstMeetingIcon: meetingIcons[0],
        avatarBg: avatarStyle?.backgroundColor,
        avatarColor: avatarRing?.querySelector('.sidebar-user-avatar') ? window.getComputedStyle(avatarRing.querySelector('.sidebar-user-avatar')).color : null
      };
    })()`
  });
  console.log('State verification:', JSON.stringify(checkState.result.value, null, 2));

  // Capture Expanded Sidebar Screenshot
  const expandedShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_original_expanded.png', Buffer.from(expandedShot.data, 'base64'));

  // 3. Test Collapse
  console.log('Collapsing sidebar...');
  await send('Runtime.evaluate', { expression: "document.querySelector('#sidebar-collapse-btn').click()" });
  await new Promise(r => setTimeout(r, 700));

  const collapsedShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_original_collapsed.png', Buffer.from(collapsedShot.data, 'base64'));

  // Expand back
  await send('Runtime.evaluate', { expression: "document.querySelector('#sidebar-collapse-btn').click()" });
  await new Promise(r => setTimeout(r, 600));

  console.log('All tests completed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
