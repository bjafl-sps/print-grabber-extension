import { DEFAULT_SETTINGS } from './constants';
import { DomainSettings, MessageRequest, MessageResponse, PrintData } from './types';

// Global variables
let currentSettings: DomainSettings | null = null;
let foundElement: Element | null = null;
let originalPrintFunction: () => void | null = () => null;

// Initialize extension
(async function () {
    const url = new URL(window.location.href);
    const domain = url.hostname;

    // Get domain settings
    const result = await chrome.storage.local.get(['domains', 'defaultSettings']);
    const domains = result.domains || {};
    currentSettings = (domains[domain] || result.defaultSettings || DEFAULT_SETTINGS) as DomainSettings;

    // Check for matching selectors
    await findMatchingElement();

    // Intercept print event if needed
    if (currentSettings.capturePrintEvent) {
        interceptPrintEvent();
    }
})();

// Message listener
chrome.runtime.onMessage.addListener(async function (
    request: MessageRequest,
    _, //sender,
    sendResponse: (response?: MessageResponse) => void
) {
    if (request.action === 'checkSelectors') {
        await findMatchingElement();
        sendResponse({ found: foundElement !== null });
        return true;
    }

    if (request.action === 'printContent') {
        if (foundElement) {
            try {
                await sendElementToBackground(foundElement);
                sendResponse({ found: true });
            } catch (error) {
                console.error('Failed to send content:', error);
                sendResponse({ found: false });
            }
        } else {
            console.error('No element found to print');
            sendResponse({ found: false });
        }
        return true;
    }

    if (request.action === 'updateSettings' && request.settings) {
        currentSettings = request.settings;
        await findMatchingElement();
        sendResponse({ found: foundElement !== null });
        return true;
    }
    
    return false;
});

// Find first matching element from the selectors list
async function findMatchingElement(): Promise<void> {
    foundElement = null;

    if (!currentSettings || !currentSettings.selectors) {
        return;
    }
    
    if (currentSettings.iframeSelectors && currentSettings.iframeSelectors.length > 0) {
        for (const selector of currentSettings.iframeSelectors) {
            try {
                const element = document.querySelector(selector);
                const iframe = element as HTMLIFrameElement;
                await iframeLoaded(iframe);
                
                const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDocument) {
                    foundElement = findDocumentElement(iframeDocument);
                    break;
                }
            } catch (e) {
                console.error(`Error selecting iframe with selector: ${selector}`, e);
            }
        }
    } else {
        foundElement = findDocumentElement(document);
    }
    
    chrome.runtime.sendMessage({
        action: 'updateBadge',
        found: foundElement !== null
    });
}

async function iframeLoaded(iframe: HTMLIFrameElement): Promise<void> {
    return new Promise(resolve => {
        if (iframe.contentDocument &&
            iframe.contentDocument.readyState === 'complete') {
            resolve();
        } else {
            iframe.onload = () => resolve();
        }
    });
}

function findDocumentElement(doc: Document): Element | null {
    let foundElement = null;
    if (!currentSettings || !currentSettings.selectors) {
        return null;
    }
    for (const selector of currentSettings.selectors) {
        try {
            const element = doc.querySelector(selector);
            if (element) {
                foundElement = element;
                break;
            }
        } catch (e) {
            console.error(`Invalid selector: ${selector}`, e);
        }
    }

    return foundElement;
}

// Send the element content to the background script
async function sendElementToBackground(element: Element): Promise<void> {
    if (!currentSettings) {
        console.error('No settings found, aborting print');
        return;
    }
    
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Create a wrapper to apply styles
    const wrapper = document.createElement('div');
    wrapper.appendChild(clonedElement);
    
    // Apply print styles
    const style = document.createElement('style');
    style.textContent = await fetchPrintCss(); 
    wrapper.appendChild(style);
    
    // Create the content object to send to background
    const contentData: PrintData = {
        html: wrapper.innerHTML,
        settings: currentSettings,
        documentTitle: document.title,
        url: window.location.href,
        hostname: window.location.hostname
    };
    console.log('Sending content to background:', contentData);
    
    // Send to background script
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'generatePdf',
            printData: contentData
        }, (response) => {
            console.log('Response from background:', response);
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else if (response && response.success) {
                resolve();
            } else {
                reject(new Error(response?.error || 'Failed to generate PDF'));
            }
        });
    });
}

// Fetch print CSS
async function fetchPrintCss(): Promise<string> {
    try {
        const cssUrl = chrome.runtime.getURL('print.css');
        const response = await fetch(cssUrl);
        return await response.text();
    } catch (error) {
        console.error('Failed to load print CSS:', error);
        return '';
    }
}

// Intercept the print event
function interceptPrintEvent(): void {
    if (window.print && !originalPrintFunction) {
        originalPrintFunction = window.print;
        window.print = function () {
            if (foundElement) {
                sendElementToBackground(foundElement).catch(error => {
                    console.error('Print failed:', error);
                    // Fall back to original print function
                    if (originalPrintFunction) {
                        originalPrintFunction.call(window);
                    }
                });
            } else if (originalPrintFunction) {
                originalPrintFunction.call(window);
            }
        };
    }
}