import { DEFAULT_SETTINGS } from './constants';
import { MessageRequest, StorageData, PrintData } from './types';

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

chrome.runtime.onMessage.addListener(function(request: MessageRequest, sender, sendResponse) {
  // Badge update message handler
  if (request.action === 'updateBadge' && sender.tab?.id) {
    updateBadge(request.found || false, sender.tab.id);
    return false;
  }
  
  // Handle PDF generation request
  if (request.action === 'generatePdf' && request.printData) {
    handlePdfGeneration(request.printData)
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        console.error('PDF generation error:', error);
        sendResponse({ success: false, error: `${error}` });
      });
    return true; // Keep the message channel open for the async response
  }
  sendResponse({success: false, error: 'Invalid action'});
  return false;
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

// Add these functions to your background.ts

// Check if offscreen document exists
async function hasOffscreenDocument(): Promise<boolean> {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
    });
    return existingContexts.length > 0;
  } catch (error) {
    // Fallback for older Chrome versions
    return false;
  }
}

// Create offscreen document if it doesn't exist
async function createOffscreenDocument(): Promise<void> {
  // Check if there's already an offscreen document
  if (await hasOffscreenDocument()) {
    return;
  }

  // Create an offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER'],
    justification: 'Generate PDFs from HTML content'
  });
  
  console.log('Offscreen document created');
}

// Close offscreen document
async function closeOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) {
    await chrome.offscreen.closeDocument();
    console.log('Offscreen document closed');
  }
}

// Generate PDF using offscreen document
async function generatePDFOffscreen(printData: PrintData): Promise<Blob> {
  // Ensure offscreen document is created
  let step = 'create-offscreen-document';
  await createOffscreenDocument();
  
  return new Promise((resolve, reject) => {
    // Track if we received a response
    let responseReceived = false;
    
    // Set up listener for the response
    const messageListener = (message: any) => {
      if (message.type === 'pdf-generated') {
        responseReceived = true;
        
        // Remove the listener to avoid memory leaks
        chrome.runtime.onMessage.removeListener(messageListener);
        
        if (message.success) {
          // Convert data URL back to blob
          const dataUrl = message.dataUrl as string;
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          
          const arrayBuffer = new ArrayBuffer(byteString.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          
          for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([arrayBuffer], { type: mimeType });
          resolve(blob);
        } else {
          reject(new Error(message.error || 'PDF generation failed'));
        }
      }
    };
    
    // Add listener
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Send the data to the offscreen document
    chrome.runtime.sendMessage({
      type: 'generate-pdf',
      data: printData
    }).catch(error => {
      if (!responseReceived) {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(error);
      }
    });
    
    // Set a timeout in case the offscreen document doesn't respond
    setTimeout(() => {
      if (!responseReceived) {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('PDF generation timed out'));
      }
    }, 30000);
  });
}

async function handlePdfGeneration(printData: PrintData): Promise<{success: boolean, error?: string}> {
  try {
    let step = 'generate-pdf';
    const pdfBlob = await generatePDFOffscreen(printData);
    
    if (!pdfBlob) {
      throw new Error('Failed to generate PDF');
    }
    
    step = 'save-pdf';
    const filename = printData.documentTitle || 'document';
    savePDF(pdfBlob, filename);
    
    return {success: true};
  } catch (error) {
    console.error('PDF generation failed:', error);
    return {success: false, error: `${error}`};
  } finally {
    await closeOffscreenDocument();
  }
}

function savePDF(blob: Blob, filename: string): void {
  // Create a download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + '.pdf';
  link.click();
  link.remove();
}
