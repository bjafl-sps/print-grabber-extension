import { DomainSettings, Margins } from "./types";
import { StyleDictionary } from "pdfmake/interfaces";

export const DEFAULT_MARGINS: Margins = {
    top: '25mm',
    right: '25mm',
    bottom: '25mm',
    left: '25mm'
};

export const DEFAULT_SELECTORS = ['article', 'main', '.content', '#content'];

export const DEFAULT_SETTINGS: DomainSettings = {
    pageSize: 'A4',
    margins: DEFAULT_MARGINS,
    iframeSelectors: [],
    selectors: DEFAULT_SELECTORS,
    customCSS: '',
    header: '',
    footer: '',
    capturePrintEvent: true
};

export const PRINT_STYLES: StyleDictionary = {
    // Base elements
    "body": {
      //"fontSize": 12,
      //"lineHeight": 1.5,
      //"width": "100%",
      "margin": 0,
    },
    
    "article": {
      "margin": 0
    },
    
    "main": {
      "margin": 0,
    },
    
    "content": {
      "margin": 0,
    },
    
    // Links
    "a": {
      "color": "#000",
      "decoration": "underline"
    },
    
    // Images
    "img": {
      "alignment": "center"
    },
    
    "figure": {
      "alignment": "center"
    },
    
    // Headers
    "h1": {
      "fontSize": 18,
      "bold": true,
      "margin": [0, 10, 0, 5]
    },
    
    "h2": {
      "fontSize": 16,
      "bold": true,
      "margin": [0, 8, 0, 4]
    },
    
    "h3": {
      "fontSize": 14,
      "bold": true,
      "margin": [0, 6, 0, 3]
    },
    
    "h4": {
      "fontSize": 13,
      "bold": true,
      "margin": [0, 5, 0, 2]
    },
    
    "h5": {
      "fontSize": 12,
      "bold": true,
      "margin": [0, 4, 0, 2]
    },
    
    "h6": {
      "fontSize": 12,
      "italics": true,
      "margin": [0, 4, 0, 2]
    },
    
    /*/ Paragraphs
    "p": {
      "margin": [0, 0, 0, 5]
    },*/
    
    // Tables
    "table": {
      //"margin": [0, 5, 0, 15]
    },
    
    "th": {
      "margin": 8,
    },
    
    "td": {
      "margin": 8,
    },
    

  };
