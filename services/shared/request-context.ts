import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  tenantId?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function setTenantId(tenantId: string): void {
  requestContext.enterWith({ tenantId });
}

export function getTenantId(): string | undefined {
  return requestContext.getStore()?.tenantId;
}

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContext.run(context, fn);
}

export default {
  setTenantId,
  getTenantId,
  runWithContext,
};
