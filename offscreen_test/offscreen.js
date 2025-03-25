

// Listen for messages from the extension
document.addEventListener("dbugMessage", function (e) {
  const message = e.detail;
  const sendResponse = e.detail.sendResponse;
  console.log("Received message:", message);
  //chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message.type);

  if (message.type === "generate-pdf") {
    generatePDF(message.data)
      .then((blob) => {
        // Convert blob to data URL to send back
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          //chrome.runtime.sendMessage
          sendResponse({
            type: "pdf-generated",
            success: true,
            dataUrl: base64data,
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        console.error("[Offscreen] PDF generation error:", error);
        //chrome.runtime.sendMessage
        sendResponse({
          type: "pdf-generated",
          success: false,
          error: error.message,
        });
      });
  }

  // No need to return true since we're not using sendResponse
});

// Generate PDF function
async function generatePDF(data) {
  try {
    console.log("[Offscreen] Generating PDF...");

    // Parse HTML to create DOM
    /*const parser = new DOMParser();
        console.log('html-in', data.html);
        const doc = parser.parseFromString(data.html.replace('Calibri', 'Roboto'), 'text/html');/*`
            <html>
            <head></head>
            <body><body>
            </html>`,
             'text/html');
        if (/^\s*<body/.test(data.html)) {
            doc.body.outerHTML = data.html;
        } else {
            doc.body.innerHTML = data.html;
        }*/ /*
        console.log(doc.documentElement.outerHTML);
        let head = "<head><link rel='stylesheet' href='print.css'>";
        // Apply custom CSS if provided
        if (data.settings.customCSS) {
            head += "<style>" + data.settings.customCSS + "</style>";
            /*const baseStyles = doc.createElement('link');
            baseStyles.rel = 'stylesheet';
            baseStyles.href = 'print.css';//chrome.runtime.getURL('print.css');
            doc.head.appendChild(baseStyles);
            const style = document.createElement('style');
            style.textContent = data.settings.customCSS;
            doc.head.appendChild(style);*/ /*
        }
        head += "<style>* { font-family: 'Roboto', sans-serif !important; }</style>";
        head += "</head>";
        doc.head.innerHTML = head;
        console.log(doc);
        console.log('html-ready', doc.documentElement.outerHTML);*/
    const htmlContent = String(data.html); //.replaceAll('Calibri', 'Roboto');
    //console.log('html-in', htmlContent);
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    doc.body.classList.forEach((name) => {
      document.body.classList.add(name);
    });
    removeUnknownFonts(doc.body);
    doc.body.childNodes.forEach((node) => {
      document.body.appendChild(node.cloneNode(true));
    });
    //addNoBreakClass(document.body);
    //console.log('html-ready', document.documentElement.outerHTML);
    // Convert HTML to pdfmake format
    const pdfContent = htmlToPdfmake(document.documentElement.innerHTML, {
      styles: getPrintStyles(),
      /*customClass: (element, className) => {
        if (className === "no-break") {
          return { __nodeClass: className };
        }
      }*/
    });
    pdfContent.forEach((content) => {
        if (content.breakInside && content.breakInside === 'avoid') {
            /*content.pageBreakBefore = function(currentNode, nodeContainer){//followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) {
                return currentNode.headlineLevel === 1 && nodeContainer.getFollowingNodesOnPage().length === 0;
            };*/
            content.unbreakable = true;
        }
    });
    console.log("pdf-content", pdfContent);
    console.log(pdfContent);
    // Process margins
    const settings = data.settings;
    const margins = settings.margins;
    const contentMargins = [
        margins.left,
        margins.top, 
        margins.right, 
        margins.bottom, 
    ].map((m) => parseFloat(m) * 2.83);
console.log('content margins', contentMargins); 
    // Prepare header and footer
    const header = prepareHeaderFooter(settings.header, data);
    const footer = prepareHeaderFooter(settings.footer, data);
    const padding = 12;
    const headerMargins = [
        contentMargins[0]*0.9, 
        contentMargins[1]*0.5, 
        contentMargins[2]*0.9, 
        padding
    ];
    const headerHeight = header ? 56 : 0; //todo
    const diffHeaderMargins = contentMargins[1] - headerMargins[1] ;
    contentMargins[1] += diffHeaderMargins < headerHeight ? diffHeaderMargins : 0;
    const footerMargins = [
        contentMargins[0]*0.9, 
        padding,
        contentMargins[2]*0.9,
        contentMargins[3]*0.5 
    ];
    const footerHeight = footer ? 20 : 0; //todo
    const diffFooterMargins = contentMargins - footerMargins[3] ;
    contentMargins[3] += diffFooterMargins < footerHeight ? diffFooterMargins : 0;

    const { aspectRatio, width, height } = await getDataURLAspectRatio(vfs["logo.png"]);
    console.log(contentMargins, headerMargins, footerMargins);
    // Create document definition
    const docDefinition = {
      content: [pdfContent],
      pageSize: settings.pageSize,
      pageMargins: contentMargins,
      header: header
        ? {
            margin: headerMargins,
            columns: [
              {
                text: header,
                alignment: "center",
              },
              {
                image: "logo.png",
                width: headerHeight * aspectRatio,
                height: headerHeight,
                alignment: "right",
              },
            ],
          }
        : undefined,
      footer: footer
        ? function (currentPage, pageCount) {
            return {
              text:
                footer +
                " | Page " +
                currentPage.toString() +
                " of " +
                pageCount,
              alignment: "center",
              margin: footerMargins,
            };
          }
        : undefined,
      defaultStyles: getPrintStyles(),
    };
    console.log("doc-def", docDefinition);

    // Generate PDF
    return new Promise((resolve, reject) => {
      try {
        console.log("[Offscreen] Creating PDF with definition:", docDefinition);
        //pdfMake.vfs = vfs;
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBlob((blob) => {
          console.log("[Offscreen] PDF blob created, size:", blob.size);
          resolve(blob);
        });
      } catch (error) {
        console.error("[Offscreen] PDF creation error:", error);
        reject(error);
      }
    });
  } catch (error) {
    console.error("[Offscreen] Unexpected error in generatePDF:", error);
    throw error;
  }
}

// Helper function for placeholders
function prepareHeaderFooter(content, data) {
  if (!content) return "";

  // Replace placeholders
  const now = new Date();
  return content
    .replace("{url}", data.url || "")
    .replace("{title}", data.documentTitle || "")
    .replace("{date}", now.toLocaleDateString())
    .replace("{time}", now.toLocaleTimeString())
    .replace("{domain}", data.hostname || "");
}

// Get print styles
function getPrintStyles() {
  return {
    "*": { font: "Roboto" },
    body: { margin: 0, font: "Roboto" },
    article: { margin: 0 },
    main: { margin: 0 },
    content: { margin: 0 },
    a: { color: "#000", decoration: "underline" },
    img: { alignment: "center" },
    figure: { alignment: "center" },
    h1: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
    h2: { fontSize: 16, bold: true, margin: [0, 8, 0, 4] },
    h3: { fontSize: 14, bold: true, margin: [0, 6, 0, 3] },
    h4: { fontSize: 13, bold: true, margin: [0, 5, 0, 2] },
    h5: { fontSize: 12, bold: true, margin: [0, 4, 0, 2] },
    h6: { fontSize: 12, italics: true, margin: [0, 4, 0, 2] },
    table: {},
    th: { margin: 8 },
    td: { margin: 8 },
  };
}

function removeUnknownFonts(element, recurse = true) {
  const fonts = Object.keys(vfs).map((key) => {
    const stop = key.lastIndexOf(".");
    const stop2 = key.indexOf("-");
    return key.slice(0, stop < stop2 ? stop : stop2);
  });
  if (element.style && element.style.fontFamily) {
    const fontFamilies = element.style.fontFamily.split(",");
    const fontOk = fontFamilies.some((font) => fonts.includes(font));
    if (!fontOk) {
      element.style.fontFamily = "";
    } else {
      element.style.fontFamily = fontOk.join(",");
    }
  }
  if (recurse && element.children) {
    element.childNodes.forEach((child) => removeUnknownFonts(child, recurse));
  }
}

function addNoBreakClass(element, recurse=true) {
    if (!Element.prototype.isPrototypeOf(element)) return;
    if (window.getComputedStyle(element).breakInside == 'avoid') {
        element.classList.add('no-break');
    }
    if (recurse && element.children) {
        element.childNodes.forEach((child) => addNoBreakClass(child, recurse));
    }
}

function getDataURLAspectRatio(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = function() {
        const aspectRatio = this.width / this.height;
        resolve({
          aspectRatio: aspectRatio,
          width: this.width,
          height: this.height
        });
      };
      
      img.onerror = function() {
        reject(new Error('Failed to load image from data URL'));
      };
      
      img.src = `data:image/png;base64,${dataURL}`;
    });
  }