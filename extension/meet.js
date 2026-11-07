// Signals contain no meeting content, URLs, or participant data.
let announced = false;
let endTimer = null;
let leaving = false;
const leaveLabel = /^(leave call|leave meeting|end call)$/i;
function isJoinedMeeting() {
  if (!/^\/(?:meet\/)?[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(location.pathname)) return false;
  const controls = document.querySelectorAll('button[aria-label], [role="button"][aria-label]');
  return Array.from(controls).some(el => leaveLabel.test(el.getAttribute('aria-label') || ''));
}
// Listen before Meet handles the click, so capture stops without waiting for
// the post-meeting screen or the disappearance fallback.
document.addEventListener('click', event => {
  const control = event.target?.closest?.('button[aria-label], [role="button"][aria-label]');
  if (!announced || !control || !leaveLabel.test(control.getAttribute('aria-label') || '')) return;
  if (endTimer !== null) { clearTimeout(endTimer); endTimer = null; }
  leaving = true;
  announced = false;
  chrome.runtime.sendMessage({type: 'meeting-ended'}).catch(() => {});
}, true);
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type === 'saamba-meeting-state') respond({joined:isJoinedMeeting()});
});
function checkMeeting() {
  const joined = isJoinedMeeting();
  if (leaving) {
    if (!joined) leaving = false;
    return;
  }
  if (joined) {
    if (endTimer !== null) { clearTimeout(endTimer); endTimer = null; }
    if (!announced) {
      announced = true;
      chrome.runtime.sendMessage({type: 'joined-meeting'}).catch(() => { announced = false; });
    }
  } else if (announced && endTimer === null) {
    endTimer = setTimeout(() => {
      endTimer = null;
      if (isJoinedMeeting()) return;
      announced = false;
      chrome.runtime.sendMessage({type: 'meeting-ended'}).catch(() => {});
    }, 10000);
  }
}
new MutationObserver(checkMeeting).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['aria-label']});
checkMeeting();
