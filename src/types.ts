export interface Margins {
    top: string;
    right: string;
    bottom: string;
    left: string;
}

export interface DomainSettings {
    pageSize: string;
    margins: Margins;
    iframeSelectors: string[];
    selectors: string[];
    customCSS: string;
    header: string;
    footer: string;
    capturePrintEvent: boolean;
}

export interface StorageData {
    defaultSettings: DomainSettings;
    domains: Record<string, DomainSettings>;
}

export interface MessageRequest {
    action: 'checkSelectors' | 'printContent' | 'updateSettings' | 'updateBadge' | 'error' | 'printOk' | 'debug';
    selectors?: string[];
    settings?: DomainSettings;
    found?: boolean;
    printData?: PrintData;
    message?: string;
}

export interface MessageResponse {
    found?: boolean;
}

export interface PrintData {
    html: string;
    settings: DomainSettings;
    documentTitle: string;
    url: string;
    hostname: string;
}