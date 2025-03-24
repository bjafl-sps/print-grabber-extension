import { DEFAULT_SETTINGS } from './constants';
import { MessageRequest, StorageData } from './types';

declare function importScripts(...urls: string[]): void;
importScripts('makePdf.js', 'pdfmake.js', 'pdffonts.js', 'htmltopdfmake.js');


// Initialize extension settings
chrome.runtime.onInstalled.addListener(function() {
  // Set default settings
  chrome.storage.local.get(['defaultSettings'], function(result: Partial<StorageData>) {
    if (!result.defaultSettings) {
      chrome.storage.local.set({
        defaultSettings: DEFAULT_SETTINGS,
        domains: {}
      });
    }
  });

  // Create context menu for options
  chrome.contextMenus.create({
    id: 'settings',
    title: 'Print Grabber Settings',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'domain-settings',
    title: 'Settings for Current Domain',
    contexts: ['action']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'settings') {
    chrome.tabs.create({url: 'settings.html'});
  } else if (info.menuItemId === 'domain-settings') {
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const domain = url.hostname;
      chrome.tabs.create({url: `settings.html?domain=${domain}`});
    }
  }
});

// Badge update message handler
chrome.runtime.onMessage.addListener(function(request: MessageRequest, sender) { //, sendResponse) {
  if (request.action === 'updateBadge' && sender.tab?.id) {
    updateBadge(request.found || false, sender.tab.id);
  }
});

// Update badge based on element found status
function updateBadge(found: boolean, tabId: number): void {
  if (found) {
    chrome.action.setBadgeText({text: '✓', tabId: tabId});
    chrome.action.setBadgeBackgroundColor({color: '#4CAF50', tabId: tabId});
  } else {
    chrome.action.setBadgeText({text: 'X', tabId: tabId});
    chrome.action.setBadgeBackgroundColor({color: '#F44336', tabId: tabId});
  }
}

// Update badge when tab is updated
chrome.tabs.onUpdated.addListener(function(_, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
      // Badge will be updated by content script
    }
  });



