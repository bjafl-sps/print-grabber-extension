import { DomainSettings, StorageData } from './types';
import { DEFAULT_SETTINGS } from './constants';
// DOM Elements
const domainDisplay = document.getElementById('domain-display') as HTMLSpanElement;
const saveAsDefaultCheckbox = document.getElementById('save-as-default') as HTMLInputElement;
const pageSizeSelect = document.getElementById('page-size') as HTMLSelectElement;
const marginTopInput = document.getElementById('margin-top') as HTMLInputElement;
const marginRightInput = document.getElementById('margin-right') as HTMLInputElement;
const marginBottomInput = document.getElementById('margin-bottom') as HTMLInputElement;
const marginLeftInput = document.getElementById('margin-left') as HTMLInputElement;
const capturePrintEventCheckbox = document.getElementById('capture-print-event') as HTMLInputElement;
const selectorsContainer = document.getElementById('selectors-container') as HTMLDivElement;
const addSelectorButton = document.getElementById('add-selector') as HTMLButtonElement;
const iframeSelectorsContainer = document.getElementById('iframe-selectors-container') as HTMLDivElement;
const addIframeSelectorButton = document.getElementById('add-iframe-selector') as HTMLButtonElement;
const customCssTextarea = document.getElementById('custom-css') as HTMLTextAreaElement;
const headerTextarea = document.getElementById('header') as HTMLTextAreaElement;
const footerTextarea = document.getElementById('footer') as HTMLTextAreaElement;
const resetToDefaultButton = document.getElementById('reset-to-default') as HTMLButtonElement;
const cancelButton = document.getElementById('cancel-button') as HTMLButtonElement;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Global variables
let currentDomain: string | null = null;
let defaultSettings: DomainSettings | null = null;
let currentSettings: DomainSettings | null = null;
let domains: Record<string, DomainSettings> = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async function () {
    // Check if a specific domain was requested
    const urlParams = new URLSearchParams(window.location.search);
    currentDomain = urlParams.get('domain');

    // Load settings
    await loadSettings();

    // Setup event listeners
    setupEventListeners();

    // Setup tabs
    setupTabs();
});

// Load settings from storage
async function loadSettings(): Promise<void> {
    const result = await chrome.storage.local.get(['defaultSettings', 'domains']) as StorageData;
    defaultSettings = result.defaultSettings || DEFAULT_SETTINGS;
    domains = result.domains || {};

    // Set domain display
    if (currentDomain) {
        domainDisplay.textContent = currentDomain;
        currentSettings = domains[currentDomain] || JSON.parse(JSON.stringify(defaultSettings));
    } else {
        currentSettings = JSON.parse(JSON.stringify(defaultSettings));
        saveAsDefaultCheckbox.checked = true;
        saveAsDefaultCheckbox.disabled = true;
    }

    // Populate form with settings
    if (currentSettings) {
        populateForm();
    }
}

// Populate form with current settings
function populateForm(): void {
    if (!currentSettings) return;

    // Page size
    pageSizeSelect.value = currentSettings.pageSize || 'A4';

    // Margins
    const margins = currentSettings.margins || {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
    };
    marginTopInput.value = margins.top;
    marginRightInput.value = margins.right;
    marginBottomInput.value = margins.bottom;
    marginLeftInput.value = margins.left;

    // Capture print event
    capturePrintEventCheckbox.checked = currentSettings.capturePrintEvent !== false;

    // Selectors
    selectorsContainer.innerHTML = '';
    (currentSettings.selectors || []).forEach(function (selector) {
        addSelectorInput(selector);
    });
    // Iframe selectors
    iframeSelectorsContainer.innerHTML = '';
    (currentSettings.iframeSelectors || []).forEach(function (selector) {
        addSelectorInput(selector, true);
    });

    // Custom CSS
    customCssTextarea.value = currentSettings.customCSS || '';

    // Header and footer
    headerTextarea.value = currentSettings.header || '';
    footerTextarea.value = currentSettings.footer || '';
}

// Setup event listeners
function setupEventListeners(): void {
    // Add iframe selector button
    addIframeSelectorButton.addEventListener('click', function () {
        addSelectorInput('', true);
    });
    // Add selector button
    addSelectorButton.addEventListener('click', function () {
        addSelectorInput('');
    });

    // Reset to default button
    resetToDefaultButton.addEventListener('click', function () {
        if (defaultSettings && confirm('Are you sure you want to reset these settings to the default values?')) {
            currentSettings = JSON.parse(JSON.stringify(defaultSettings));
            populateForm();
        }
    });

    // Cancel button
    cancelButton.addEventListener('click', function () {
        window.close();
    });

    // Save button
    saveButton.addEventListener('click', saveSettings);
}

// Setup tabs
function setupTabs(): void {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all tab contents
            tabContents.forEach(content => content.classList.add('hidden'));

            // Show the corresponding tab content
            const tabId = (tab as HTMLElement).dataset.tab + '-tab';
            const contentElement = document.getElementById(tabId);
            if (contentElement) {
                contentElement.classList.remove('hidden');
            }
        });
    });
}

// Add selector input
function addSelectorInput(value: string, iframe: boolean = false): void {
    const selectorItem = document.createElement('div');
    selectorItem.className = 'selector-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = iframe ? 'iframe-selector-input' : 'selector-input';
    input.value = value;
    input.placeholder = 'CSS Selector (e.g., article, .content, #main)';

    const removeButton = document.createElement('button');
    removeButton.className = 'btn-remove';
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', function () {
        selectorItem.remove();
    });

    selectorItem.appendChild(input);
    selectorItem.appendChild(removeButton);
    const container = iframe ? iframeSelectorsContainer : selectorsContainer;
    container.appendChild(selectorItem);
}

// Save settings
async function saveSettings(): Promise<void> {
    // Get values from form
    const settings: DomainSettings = {
        pageSize: pageSizeSelect.value,
        margins: {
            top: marginTopInput.value || DEFAULT_SETTINGS.margins.top,
            right: marginRightInput.value || DEFAULT_SETTINGS.margins.right,
            bottom: marginBottomInput.value || DEFAULT_SETTINGS.margins.bottom,
            left: marginLeftInput.value || DEFAULT_SETTINGS.margins.left
        },
        iframeSelectors: Array.from(document.querySelectorAll<HTMLInputElement>('.iframe-selector-input'))
            .map(input => input.value)
            .filter(value => value.trim() !== ''),
        selectors: Array.from(document.querySelectorAll<HTMLInputElement>('.selector-input'))
                .map(input => input.value)
                .filter(value => value.trim() !== ''),
        customCSS: customCssTextarea.value,
        header: headerTextarea.value,
        footer: footerTextarea.value,
        capturePrintEvent: capturePrintEventCheckbox.checked
    };

    // Save to storage
    const result = await chrome.storage.local.get(['domains', 'defaultSettings']) as StorageData;
    const domains = result.domains || {};

    if (saveAsDefaultCheckbox.checked || !currentDomain) {
        // Save as default settings
        await chrome.storage.local.set({
            defaultSettings: settings
        });
    }

    if (currentDomain) {
        // Save domain-specific settings
        domains[currentDomain] = settings;
        await chrome.storage.local.set({
            domains: domains
        });

        // Update settings in active tab if it's the current domain
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].id && currentDomain && tabs[0].url.includes(currentDomain)) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSettings',
                    settings: settings
                });
            }
        });
    }

    alert('Settings saved successfully!');
    window.close();
}