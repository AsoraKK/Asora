/**
 * Mock Cosmos Database Client
 *
 * Simulates Cosmos DB operations for testing notification repositories.
 * Provides in-memory storage of test data.
 *
 * **DO NOT USE IN PRODUCTION**
 */


/**
 * In-memory document store for mock Cosmos
 */
class MockCosmosContainer {
  private documents: Map<string, Record<string, unknown>> = new Map();

  /**
   * Create or upsert a document
   */
  async create(
    item: Record<string, unknown>
  ): Promise<{ resource: Record<string, unknown>; statusCode: number }> {
    const id = item.id as string;
    if (this.documents.has(id)) {
      throw new Error(`Document with id ${id} already exists`);
    }
    this.documents.set(id, { ...item });
    return { resource: { ...item }, statusCode: 201 };
  }

  /**
   * Read a document
   */
  async read(id: string): Promise<{ resource: Record<string, unknown> | null; statusCode: number }> {
    const doc = this.documents.get(id);
    if (!doc) {
      const error = new Error(`Document not found`) as any;
      error.code = 404;
      throw error;
    }
    return { resource: { ...doc }, statusCode: 200 };
  }

  /**
   * Replace/update a document
   */
  async replace(
    id: string,
    item: Record<string, unknown>
  ): Promise<{ resource: Record<string, unknown>; statusCode: number }> {
    if (!this.documents.has(id)) {
      const error = new Error(`Document not found`) as any;
      error.code = 404;
      throw error;
    }
    this.documents.set(id, { ...item });
    return { resource: { ...item }, statusCode: 200 };
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<{ statusCode: number }> {
    if (!this.documents.has(id)) {
      const error = new Error(`Document not found`) as any;
      error.code = 404;
      throw error;
    }
    this.documents.delete(id);
    return { statusCode: 204 };
  }

  /**
   * Get all documents
   */
  getAllDocuments(): Record<string, unknown>[] {
    return Array.from(this.documents.values());
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Get document count
   */
  getCount(): number {
    return this.documents.size;
  }

  /**
   * Get a specific document
   */
  getDocument(id: string): Record<string, unknown> | undefined {
    return this.documents.get(id);
  }
}

/**
 * Mock Cosmos item reference
 */
class MockCosmosItemRef {
  constructor(
    private id: string,
    private partitionKey: string,
    private container: MockCosmosContainer
  ) {}

  read() {
    return {
      then: async (fn: Function) => {
        const result = await this.container.read(this.id);
        return fn(result);
      },
    };
  }

  replace(item: Record<string, unknown>) {
    return {
      then: async (fn: Function) => {
        const result = await this.container.replace(this.id, item);
        return fn(result);
      },
    };
  }

  delete() {
    return {
      then: async (fn: Function) => {
        const result = await this.container.delete(this.id);
        return fn(result);
      },
    };
  }
}

/**
 * Mock Cosmos items collection
 */
class MockCosmosItems {
  constructor(private container: MockCosmosContainer) {}

  async create(item: Record<string, unknown>) {
    return this.container.create(item);
  }

  query(sql: string) {
    return {
      fetchAll: async () => {
        // Simple mock: return all documents as query result
        return { resources: this.container.getAllDocuments() };
      },
    };
  }
}

/**
 * Mock Cosmos Container implementation
 */
export class MockContainer {
  private internalContainer: MockCosmosContainer;

  constructor() {
    this.internalContainer = new MockCosmosContainer();
  }

  get items() {
    return new MockCosmosItems(this.internalContainer);
  }

  item(id: string, partitionKey?: string) {
    return new MockCosmosItemRef(id, partitionKey || id, this.internalContainer);
  }

  /**
   * Get internal container for test assertions
   */
  _getInternalContainer(): MockCosmosContainer {
    return this.internalContainer;
  }

  /**
   * Reset to clean state
   */
  reset(): void {
    this.internalContainer.clear();
  }
}

/**
 * Global mock container instance
 */
let globalMockContainer: MockContainer | null = null;

/**
 * Get or create global mock container
 */
export function getGlobalMockContainer(): MockContainer {
  if (!globalMockContainer) {
    globalMockContainer = new MockContainer();
  }
  return globalMockContainer;
}

/**
 * Reset global mock container
 */
export function resetGlobalMockContainer(): void {
  if (globalMockContainer) {
    globalMockContainer.reset();
  }
}

/**
 * Clear global mock container (for test setup/teardown)
 */
export function clearGlobalMockContainer(): void {
  globalMockContainer = null;
}
