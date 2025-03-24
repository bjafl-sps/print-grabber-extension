import pdfMake from 'pdfmake/build/pdfmake';
import { PRINT_STYLES } from './constants';
import { PageSize, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PrintData } from './types';

/**
 * Generate a PDF from HTML content
 * This should be called from the background script, not the content script
 */
export async function generatePDF(data: PrintData): Promise<Blob | null> {
    try {
        if (!data) {
            throw new Error('No content to print');
        }
        
        console.log('Generating PDF...');
        
        // Get settings
        const settings = data.settings;
        
        // Create a temporary offscreen document to process HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.html, 'text/html');
        
        // Apply custom CSS if provided
        if (settings.customCSS) {
            const style = document.createElement('style');
            style.textContent = settings.customCSS;
            doc.head.appendChild(style);
        }
        
        // Convert HTML to pdfmake format
        const pdfContent = htmlToPdfmake(doc.body.innerHTML, {
            defaultStyles: PRINT_STYLES
        });
        
        // Process page size and margins
        const pageSize: PageSize = settings.pageSize as PageSize;
        
        // Convert margins from mm to points (1mm ≈ 2.83 points)
        const margins = settings.margins;
        const marginTop = parseFloat(margins.top) * 2.83;
        const marginRight = parseFloat(margins.right) * 2.83;
        const marginBottom = parseFloat(margins.bottom) * 2.83;
        const marginLeft = parseFloat(margins.left) * 2.83;
        
        // Prepare header and footer
        const header = prepareHeaderFooter(settings.header, data);
        const footer = prepareHeaderFooter(settings.footer, data);
        
        // Create document definition
        const docDefinition: TDocumentDefinitions = {
            content: [pdfContent],
            pageSize: pageSize,
            pageMargins: [marginLeft, marginTop, marginRight, marginBottom],
            header: header ? 
                {
                    text: header,
                    alignment: 'center',
                    margin: [marginLeft, 10, marginRight, 0]
                }
             : undefined,
            footer: footer ? function(currentPage, pageCount) {
                return {
                    text: footer + ' | Page ' + currentPage.toString() + ' of ' + pageCount,
                    alignment: 'center',
                    margin: [marginLeft, 0, marginRight, 10]
                };
            } : undefined,
            styles: PRINT_STYLES
        };
        
        // Generate PDF
        return new Promise<Blob>((resolve, reject) => {
            try {
                const pdfDocGenerator = pdfMake.createPdf(docDefinition);
                pdfDocGenerator.getBlob((blob) => {
                    console.log('PDF generated successfully');
                    resolve(blob);
                });
            } catch (error) {
                reject(error);
            }
        });
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        return null;
    }
}

/**
 * Convert HTML string to pdfMake content
 * This uses the htmlToPdfmake library which must be loaded
 */
function htmlToPdfmake(html: string, options: any = {}): any {
    // This function assumes that the htmlToPdfmake function has been
    // made available globally or via import
    if (typeof (window as any).htmlToPdfmake !== 'function') {
        throw new Error('htmlToPdfmake library not loaded');
    }
    
    return (window as any).htmlToPdfmake(html, options);
}

/**
 * Prepare header or footer text with placeholders replaced
 */
function prepareHeaderFooter(content: string, data: PrintData): string {
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

/**
 * Save the generated PDF to disk
 */
export function savePDF(blob: Blob, filename: string): void {
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFilename(filename) + '.pdf';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Sanitize a filename to make it safe for saving
 */
function sanitizeFilename(name: string): string {
    return name
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_')
        .substring(0, 100) || 'document';
}