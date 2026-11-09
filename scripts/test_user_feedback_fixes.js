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

  // 1. Sign out to test guest unauthenticated state
  console.log('Clearing auth to test unauthenticated guest state...');
  await send('Page.navigate', { url: 'http://localhost:3001/v2' });
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  // Verify guest state: 0 meetings, empty state
  const guestState = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const meetings = document.querySelectorAll('.meeting');
      const emptyState = document.querySelector('.empty');
      const signInBtn = document.querySelector('#sidebar-signin-btn');
      return {
        meetingCount: meetings.length,
        hasEmptyState: !!emptyState,
        signInBtnVisible: !!signInBtn
      };
    })()`
  });
  console.log('Guest state verification:', guestState.result.value);

  // 2. Open AuthModal and test Close button
  console.log('Opening Auth modal to test redesign & close button...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#sidebar-signin-btn').click()"
  });
  await new Promise(r => setTimeout(r, 800));

  const modalCheck = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const modal = document.querySelector('#auth-modal');
      const closeBtn = document.querySelector('#close-auth-dialog');
      return {
        modalOpen: modal && modal.hasAttribute('open'),
        hasCloseBtn: !!closeBtn,
        closeBtnText: closeBtn ? closeBtn.innerText : null
      };
    })()`
  });
  console.log('Modal check before close:', modalCheck.result.value);

  // Screenshot Auth modal
  const authModalShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/auth_modal_redesigned.png',
    Buffer.from(authModalShot.data, 'base64')
  );

  // Test close button
  console.log('Clicking modal close button...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#close-auth-dialog').click()"
  });
  await new Promise(r => setTimeout(r, 500));

  const modalClosedCheck = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: "document.querySelector('#auth-modal') === null"
  });
  console.log('Modal closed successfully:', modalClosedCheck.result.value);

  // 3. Now Log In with mohan.founder@profeshare.ai
  console.log('Re-opening modal to log in with real Supabase account...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#sidebar-signin-btn').click()"
  });
  await new Promise(r => setTimeout(r, 800));

  console.log('Entering credentials...');
  await send('Runtime.evaluate', {
    expression: "(() => { const el = document.querySelector('#auth-email-input'); el.value = ''; el.focus(); })()"
  });
  await send('Input.insertText', { text: 'mohan.founder@profeshare.ai' });
  await new Promise(r => setTimeout(r, 300));

  await send('Runtime.evaluate', {
    expression: "(() => { const el = document.querySelector('#auth-password-input'); el.value = ''; el.focus(); })()"
  });
  await send('Input.insertText', { text: 'Password123!Secure' });
  await new Promise(r => setTimeout(r, 500));

  console.log('Submitting login...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#auth-form button[type=submit]').click()"
  });
  await new Promise(r => setTimeout(r, 3500));

  // 4. Verify Real-time Authenticated State & UI Redesign
  const authState = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const meetings = document.querySelectorAll('.meeting');
      const quickActionsFirst = document.querySelector('.sidebar-scrollable-content > div:first-child').classList.contains('sidebar-section-quick-actions');
      const workspacesSecond = document.querySelector('.sidebar-scrollable-content > div:nth-child(2)').classList.contains('sidebar-section-workspaces');
      const manageSection = document.querySelector('.sidebar-section-manage');
      const subMeetingsHeader = document.querySelector('.library-header');
      const activeWsRow = document.querySelector('.workspace-row.is-active');
      const wsStyle = activeWsRow ? window.getComputedStyle(activeWsRow) : null;
      const userCard = document.querySelector('.sidebar-user-card');

      return {
        meetingCount: meetings.length,
        quickActionsFirst,
        workspacesSecond,
        manageSectionOutside: !!manageSection,
        subMeetingsHeaderPresent: !!subMeetingsHeader,
        activeWsBoxShadow: wsStyle ? wsStyle.boxShadow : null,
        activeWsBorderLeft: wsStyle ? wsStyle.borderLeft : null,
        userEmailTitle: userCard ? userCard.getAttribute('title') : null,
      };
    })()`
  });
  console.log('Authenticated state verification:', authState.result.value);

  // Capture Screenshot of Redesigned Expanded Sidebar
  console.log('Capturing redesigned sidebar screenshot...');
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_v3_expanded.png',
    Buffer.from(shot1.data, 'base64')
  );

  // 5. Test Settings Popover (Relocated Manage section)
  console.log('Testing Settings gear click...');
  await send('Runtime.evaluate', {
    expression: "document.querySelectorAll('.utility-icon-btn')[1].click()"
  });
  await new Promise(r => setTimeout(r, 600));

  const settingsCheck = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: "!!document.querySelector('.sidebar-settings-popover')"
  });
  console.log('Settings popover opened:', settingsCheck.result.value);

  const shotSettings = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_v3_settings_popover.png',
    Buffer.from(shotSettings.data, 'base64')
  );

  // Close Settings
  await send('Runtime.evaluate', {
    expression: "document.querySelector('.settings-popover-close').click()"
  });
  await new Promise(r => setTimeout(r, 400));

  // 6. Test Collapse State
  console.log('Testing Collapse button...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#sidebar-collapse-btn').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  const collapsedCheck = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const quickActions = document.querySelector('.sidebar-section-quick-actions');
      const utilityBar = document.querySelector('.sidebar-utility-bar');
      const wsGroup = document.querySelector('.workspace-group');
      const avatar = document.querySelector('.sidebar-avatar-ring');
      return {
        quickActionsVisible: quickActions ? window.getComputedStyle(quickActions).display !== 'none' : false,
        utilityBarVisible: utilityBar ? window.getComputedStyle(utilityBar).display !== 'none' : false,
        workspaceVisible: wsGroup ? window.getComputedStyle(wsGroup).display !== 'none' : false,
        avatarVisible: avatar ? window.getComputedStyle(avatar).display !== 'none' : false,
      };
    })()`
  });
  console.log('Collapsed state verification:', collapsedCheck.result.value);

  const shotCollapsed = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    '/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/sidebar_v3_collapsed.png',
    Buffer.from(shotCollapsed.data, 'base64')
  );

  // Expand back
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#sidebar-collapse-btn').click()"
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('All tests completed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
