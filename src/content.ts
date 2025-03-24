

import { DEFAULT_SETTINGS } from './constants';
import { DomainSettings, MessageRequest, MessageResponse } from './types';

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
            sendElementToBackground(foundElement);
        } else {
            console.error('No element found to print');
        }
        return true;
    }

    if (request.action === 'updateSettings' && request.settings) {
        currentSettings = request.settings;
        await findMatchingElement();
        sendResponse({ found: foundElement !== null });
        return true;
    }
    if (request.action === 'error') {
        console.error(request.message);
        return true;
    }
    if (request.action === 'debug') {
        console.log(request.message);
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
    
    // Collect all relevant styles from the page
    //const styles = getPageStyles();
    
    // Create the content object to send to background
    const contentData = {
        html: wrapper.innerHTML,
        settings: currentSettings,
        documentTitle: document.title,
        url: window.location.href,
        hostname: window.location.hostname
    };
    loadScript('makePdf.js').then(() => { 
        window.dispatchEvent(new CustomEvent('generatePdf', {
        detail: { data: contentData }
      }));
    });
        
    
    // Send to background script
    /*const port = chrome.runtime.connect({ name: 'generatePdf' });
    console.log('Connected to background script', port);
    port.onMessage.addListener((response: MessageResponse) => {
        console.log(response);
    });
    const printRequest: MessageRequest = {
        action: 'printContent',
        printData: contentData
    };
    port.postMessage(printRequest);*/

    /*const response = await chrome.runtime.sendMessage({
        action: 'printContent',
        data: contentData
    });
    console.log(response);
    console.log('Sent content to background script', contentData);*/
}

/*/ Collect styles from the current page
function getPageStyles(): string {
    const stylesheets = Array.from(document.styleSheets);
    let styles = '';
    
    stylesheets.forEach(sheet => {
        try {
            const rules = sheet.cssRules || sheet.rules;
            for (let i = 0; i < rules.length; i++) {
                styles += rules[i].cssText;
            }
        } catch (e) {
            console.log('Cannot access stylesheet', e);
        }
    });
    
    return styles;
}*/

// Intercept the print event
function interceptPrintEvent(): void {
    if (window.print && !originalPrintFunction) {
        originalPrintFunction = window.print;
        window.print = function () {
            if (foundElement) {
                sendElementToBackground(foundElement);
            } else if (originalPrintFunction) {
                originalPrintFunction.call(window);
            }
        };
    }
}


/*function openPDF(pdfData: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfData);
    link.download = filename;
    link.click();
    link.remove();
}*/


  function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(url);
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      (document.head || document.documentElement).appendChild(script);
    });
  }