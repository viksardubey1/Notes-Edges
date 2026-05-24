/**
 * API Type Definitions — Notes & Edges
 * Request/response types for all API interactions.
 */

import type { GraphData, GraphNode, GraphEdge, GraphSource } from './graph';
import type { Project } from './ui';

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  name: string;
}

export type ProjectListResponse = Project[];

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphResponse extends GraphData {}

export interface GenerateGraphRequest {
  projectId: string;
  sourceType: 'pdf' | 'text' | 'url';
  content?: string;   // For text source
  fileUrl?: string;   // For PDF source (after upload)
  url?: string;       // For URL source (future)
}

export interface GenerateGraphResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  graphId?: string;
}

// ─── Graph Job Status (SSE / WebSocket) ──────────────────────────────────────

export type GraphJobStatus = 'queued' | 'chunking' | 'extracting' | 'embedding' | 'laying_out' | 'complete' | 'failed';

export interface GraphJobEvent {
  jobId: string;
  status: GraphJobStatus;
  progress: number;   // 0–100
  graphId?: string;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  error?: string;
}

// ─── Nodes ────────────────────────────────────────────────────────────────────

export interface NodeResponse extends GraphNode {}

export interface UpdateNodePositionRequest {
  nodeId: string;
  x: number;
  y: number;
}

// ─── Sources ──────────────────────────────────────────────────────────────────

export type SourceResponse = GraphSource;

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SemanticSearchRequest {
  graphId: string;
  query: string;
  limit?: number;
}

export interface SemanticSearchResult {
  nodeId: string;
  label: string;
  score: number;
  excerpt?: string;
}

export type SemanticSearchResponse = SemanticSearchResult[];

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface UserSettings {
  theme: 'dark'; // Always dark — this is not configurable in MVP
  graphDefaults: {
    layoutType: 'force' | 'hierarchical';
    clusterModeDefault: boolean;
  };
  aiDefaults: {
    extractionDepth: 'shallow' | 'deep';
    maxNodes: number;
  };
  privacy: {
    deletePdfAfterProcessing: boolean;
  };
}
