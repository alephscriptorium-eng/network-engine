// ==== Types for the @zeus/presets-sdk catalog/presets API ====
// Ported from mcp-mesh-sdk/mcp-catalog-driver.ts and adjusted to the
// unified rich preset schema and /api/mcp routes.

export type MCPItemType = 'tool' | 'resource' | 'prompt';

export interface MCPTool {
    name: string;
    description?: string;
    // JSON Schema - keep flexible
    parameters?: Record<string, unknown>;
    type: 'tool';
}

export interface MCPResource {
    name: string;
    description?: string;
    uri: string;
    mimeType?: string;
    type: 'resource';
}

export interface MCPPromptArgument {
    name: string;
    description?: string;
    required?: boolean;
}

export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: MCPPromptArgument[];
    type: 'prompt';
}

export interface MCPServerInfo {
    name: string;
    version?: string;
    url?: string;
    // allow backend to include additional fields without breaking
    [key: string]: unknown;
}

export interface MCPCatalogServer {
    serverName: string;
    serverInfo: MCPServerInfo;
    isConnected: boolean;
    extractedAt?: string;
    error?: string;
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
}

/** Response of GET {prefix}/list */
export interface MCPCatalogResponse {
    success: boolean;
    timestamp: string;
    catalog: MCPCatalogServer[];
    serversCount: number;
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
}

export interface MCPItemsCount {
    tools: number;
    resources: number;
    prompts: number;
    total: number;
}

// ==== Preset schema (unified rich schema) ====

export interface PresetItem {
    serverName: string;
    type: MCPItemType;
    name: string;
}

export interface Preset {
    id: string;
    name: string;
    description: string;
    category: string;
    prompt: string;
    items: PresetItem[];
    createdAt: string;
    updatedAt: string;
}

export interface PresetSummary {
    id: string;
    name: string;
    description: string;
    category: string;
    itemsCount: MCPItemsCount;
    createdAt: string;
    updatedAt: string;
}

/** Response of GET {prefix}/presets */
export interface PresetsListResponse {
    success: boolean;
    presets: PresetSummary[];
    totalPresets: number;
    timestamp: string;
}

/** Response of GET {prefix}/preset/:name */
export interface PresetGetResponse {
    success: boolean;
    preset?: Preset;
    error?: string;
    timestamp?: string;
}

/** Body accepted by POST {prefix}/set */
export interface PresetSetPayload {
    name: string;
    description?: string;
    category?: string;
    prompt?: string;
    items: PresetItem[];
}

/** Response of POST {prefix}/set */
export interface PresetSetResponse {
    success: boolean;
    preset?: {
        id: string;
        name: string;
        itemsCount: MCPItemsCount;
        createdAt: string;
    };
    error?: string;
    details?: string | string[];
    timestamp?: string;
}

// ==== Discovery ====

export interface DiscoveryPortRange {
    host?: string;
    from: number;
    to: number;
}

export interface DiscoveryStaticEntry {
    name?: string;
    url: string;
    transport?: string;
}

export interface DiscoverOptions {
    urls?: string[];
    portRange?: DiscoveryPortRange;
    staticList?: DiscoveryStaticEntry[];
    timeoutMs?: number;
    probePath?: string;
}

export interface DiscoveredServer {
    name: string;
    url: string;
    transport: 'http';
}
