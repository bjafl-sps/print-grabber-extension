// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Offscreen] Received message:', message.type);
    
    if (message.type === 'generate-pdf') {
        generatePDF(message.data)
            .then(blob => {
                // Convert blob to data URL to send back
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                    //chrome.runtime.sendMessage
                    sendResponse({
                        type: 'pdf-generated',
                        success: true,
                        dataUrl: base64data
                    });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('[Offscreen] PDF generation error:', error);
                //chrome.runtime.sendMessage
                sendResponse({
                    type: 'pdf-generated',
                    success: false,
                    error: error.message
                });
            });
    }
    
    // No need to return true since we're not using sendResponse
});

// Generate PDF function
async function generatePDF(data) {
    try {
        console.log('[Offscreen] Generating PDF...');
        
        // Parse HTML to create DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.html, 'text/html');
        
        // Apply custom CSS if provided
        if (data.settings.customCSS) {
            const style = document.createElement('style');
            style.textContent = data.settings.customCSS;
            doc.head.appendChild(style);
        }
        
        // Convert HTML to pdfmake format
        const pdfContent = htmlToPdfmake(doc.body.innerHTML, {
            defaultStyles: getPrintStyles()
        });
        
        // Process margins
        const settings = data.settings;
        const margins = settings.margins;
        const marginTop = parseFloat(margins.top) * 2.83;
        const marginRight = parseFloat(margins.right) * 2.83;
        const marginBottom = parseFloat(margins.bottom) * 2.83;
        const marginLeft = parseFloat(margins.left) * 2.83;
        
        // Prepare header and footer
        const header = prepareHeaderFooter(settings.header, data);
        const footer = prepareHeaderFooter(settings.footer, data);
        
        // Create document definition
        const docDefinition = {
            content: [pdfContent],
            pageSize: settings.pageSize,
            pageMargins: [marginLeft, marginTop, marginRight, marginBottom],
            header: header ? function(currentPage, pageCount) {
                return {
                    text: header,
                    alignment: 'center',
                    margin: [marginLeft, 10, marginRight, 0]
                };
            } : undefined,
            footer: footer ? function(currentPage, pageCount) {
                return {
                    text: footer + ' | Page ' + currentPage.toString() + ' of ' + pageCount,
                    alignment: 'center',
                    margin: [marginLeft, 0, marginRight, 10]
                };
            } : undefined,
            styles: getPrintStyles()
        };
        
        // Generate PDF
        return new Promise((resolve, reject) => {
            try {
                console.log('[Offscreen] Creating PDF with definition:', docDefinition);
                const pdfDocGenerator = pdfMake.createPdf(docDefinition);
                pdfDocGenerator.getBlob((blob) => {
                    console.log('[Offscreen] PDF blob created, size:', blob.size);
                    resolve(blob);
                });
            } catch (error) {
                console.error('[Offscreen] PDF creation error:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('[Offscreen] Unexpected error in generatePDF:', error);
        throw error;
    }
}

// Helper function for placeholders
function prepareHeaderFooter(content, data) {
    if (!content) return '';
    
    // Replace placeholders
    const now = new Date();
    return content
        .replace('{url}', data.url || '')
        .replace('{title}', data.documentTitle || '')
        .replace('{date}', now.toLocaleDateString())
        .replace('{time}', now.toLocaleTimeString())
        .replace('{domain}', data.hostname || '');
}

// Get print styles
function getPrintStyles() {
    return {
        "body": { "margin": 0 },
        "article": { "margin": 0 },
        "main": { "margin": 0 },
        "content": { "margin": 0 },
        "a": { "color": "#000", "decoration": "underline" },
        "img": { "alignment": "center" },
        "figure": { "alignment": "center" },
        "h1": { "fontSize": 18, "bold": true, "margin": [0, 10, 0, 5] },
        "h2": { "fontSize": 16, "bold": true, "margin": [0, 8, 0, 4] },
        "h3": { "fontSize": 14, "bold": true, "margin": [0, 6, 0, 3] },
        "h4": { "fontSize": 13, "bold": true, "margin": [0, 5, 0, 2] },
        "h5": { "fontSize": 12, "bold": true, "margin": [0, 4, 0, 2] },
        "h6": { "fontSize": 12, "italics": true, "margin": [0, 4, 0, 2] },
        "table": {},
        "th": { "margin": 8 },
        "td": { "margin": 8 }
    };
}