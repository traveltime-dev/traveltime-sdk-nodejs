import { BatchErrorResponse, BatchResponse } from './types';

export function isBatchError<T>(resp: BatchResponse<T>): resp is BatchErrorResponse { return resp.type === 'error'; }
