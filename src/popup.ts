import { DEFAULT_SETTINGS } from './constants';
import { StorageData } from './types';

document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
    const statusElement = document.getElementById('status') as HTMLDivElement;
    const printButton = document.getElementById('print-button') as HTMLButtonElement;
    const settingsLink = document.getElementById('settings-link') as HTMLAnchorElement;

    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (!currentTab.url) return;

    const url = new URL(currentTab.url);
    const domain = url.hostname;

    // Get domain settings
    const result: Partial<StorageData> = await chrome.storage.local.get(['domains', 'defaultSettings']);
    const domains = result.domains || {};
    const domainSettings = domains[domain] || result.defaultSettings || DEFAULT_SETTINGS;

    // Check if selector matches anything on the page
    if (currentTab.id) {
        const tabId = currentTab.id;
        const response = await chrome.tabs.sendMessage(tabId, {
            action: 'checkSelectors',
            selectors: domainSettings.selectors
        });

        if (response && response.found) {
            statusElement.textContent = 'Content found! Ready to print.';
            statusElement.className = 'status status-found';
            printButton.disabled = false;
        } else {
            statusElement.textContent = 'No matching content found on this page.';
            statusElement.className = 'status status-not-found';
            printButton.disabled = true;
        }
        // Print button action
        printButton.addEventListener('click', () => {
            chrome.tabs.sendMessage(tabId, {
                action: 'printContent'
            });
        });

    }

    // Settings link action
    settingsLink.addEventListener('click', function () {
        chrome.tabs.create({ url: 'settings.html' });
    });
}