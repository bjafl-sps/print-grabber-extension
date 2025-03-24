import * as pdfMake from 'pdfmake/build/pdfmake';
//import { PRINT_STYLES } from './constants';
import { PageSize, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PrintData } from './types';


export function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(url);
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      (document.head || document.documentElement).appendChild(script);
    });
  }

// Generate PDF from HTML content
export async function generatePDF(data?: PrintData, defaultPrintStyle?: any): Promise<Blob | void> {
    await Promise.all([loadScript('pdfmake.js'),
    loadScript('pdffonts.js'),
    loadScript('htmltopdfmake.js')]);
    try {
        if (!data) {
            throw new Error('No content to print');
        }
        console.log('Generating PDF...');
        // Parse HTML content to pdfmake format
        pdfMake.createPdf()
    let response = window.dispatchEvent(new CustomEvent('htmlToPdfMake', { 
        detail: { 
            documentDefinitions: data?.html, 
            defaultStyles: defaultPrintStyle 
        } 
    }));
        const pdfContent = htmlToPdfmake(data.html, {
            defaultStyles: defaultPrintStyle,
            // Optional custom styles transformer function if needed
            /*customStylesTransformer: (styles: string) => {
                // You can process/transform the styles here if needed
                return styles;
            }*/
        });
        
        // Get settings from data
        const settings = data.settings;
        
        // Get page size
        const pageSize: PageSize = settings.pageSize as PageSize;
        
        // Process margins
        const margins = settings.margins;
        
        // Convert mm to points (approx)
        const marginTop = parseFloat(margins.top) * 2.83;
        const marginRight = parseFloat(margins.right) * 2.83;
        const marginBottom = parseFloat(margins.bottom) * 2.83;
        const marginLeft = parseFloat(margins.left) * 2.83;
        
        // Prepare footer
        const footer = prepareHeaderFooter(settings.footer, data);
        
        // Create PDF document definition
        const docDefinition: TDocumentDefinitions = {
            content: [pdfContent],
            pageSize: pageSize,
            pageMargins: [marginLeft, marginTop, marginRight, marginBottom],
            footer: footer ? function(currentPage: number, pageCount: number) {
                return {
                    text: footer + ' | Page ' + currentPage.toString() + ' of ' + pageCount,
                    alignment: 'center',
                    margin: [marginLeft, 0, marginRight, 10]
                };
            } : undefined,
            styles: {
                // You can define global styles here
            }
        };
        
        // Generate PDF
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        
        // Create a blob from the PDF
        const blob = await new Promise<Blob>((resolve) => {
            pdfDocGenerator.getBlob((blob: Blob) => {
                resolve(blob);
            });
        });
        console.log('PDF generated successfully');
        return blob;
    } catch (error) {
        console.error('Failed to generate PDF:', error);
    }
}


// Prepare header or footer with domain-specific values
function prepareHeaderFooter(content: string, data: any): string {
    if (!content) return '';

    // Replace placeholders
    const now = new Date();
    content = content
        .replace('{url}', data.url || '')
        .replace('{title}', data.documentTitle || '')
        .replace('{date}', now.toLocaleDateString())
        .replace('{time}', now.toLocaleTimeString())
        .replace('{domain}', data.hostname || '');

    return content;
}
