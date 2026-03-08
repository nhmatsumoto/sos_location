export interface SpatialNode<T> {
  bounds: [number, number, number, number]; // minX, minZ, maxX, maxZ
  children: [SpatialNode<T>, SpatialNode<T>, SpatialNode<T>, SpatialNode<T>] | null;
  items: T[];
}

export class QuadtreeIndex<T extends { x: number; z: number }> {
  private root: SpatialNode<T>;
  private maxDepth: number;
  private maxItems: number;

  constructor(bounds: [number, number, number, number], maxDepth: number = 8, maxItems: number = 10) {
    this.root = { bounds, children: null, items: [] };
    this.maxDepth = maxDepth;
    this.maxItems = maxItems;
  }

  public insert(item: T) {
    this.recursiveInsert(this.root, item, 0);
  }

  private recursiveInsert(node: SpatialNode<T>, item: T, depth: number) {
    if (node.children) {
      const child = this.findChild(node, item.x, item.z);
      this.recursiveInsert(child, item, depth + 1);
      return;
    }

    node.items.push(item);

    if (node.items.length > this.maxItems && depth < this.maxDepth) {
      this.split(node, depth);
    }
  }

  private split(node: SpatialNode<T>, depth: number) {
    const [minX, minZ, maxX, maxZ] = node.bounds;
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;

    node.children = [
      { bounds: [minX, minZ, midX, midZ], children: null, items: [] },
      { bounds: [midX, minZ, maxX, midZ], children: null, items: [] },
      { bounds: [minX, midZ, midX, maxZ], children: null, items: [] },
      { bounds: [midX, midZ, maxX, maxZ], children: null, items: [] }
    ];

    const items = node.items;
    node.items = [];
    items.forEach(item => {
      const child = this.findChild(node, item.x, item.z);
      this.recursiveInsert(child, item, depth + 1);
    });
  }

  private findChild(node: SpatialNode<T>, x: number, z: number): SpatialNode<T> {
    const [minX, minZ, maxX, maxZ] = node.bounds;
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;

    if (x < midX) {
      return z < midZ ? node.children![0] : node.children![2];
    } else {
      return z < midZ ? node.children![1] : node.children![3];
    }
  }

  public query(bounds: [number, number, number, number]): T[] {
    const results: T[] = [];
    this.recursiveQuery(this.root, bounds, results);
    return results;
  }

  private recursiveQuery(node: SpatialNode<T>, bounds: [number, number, number, number], results: T[]) {
    if (!this.intersects(node.bounds, bounds)) return;

    node.items.forEach(item => {
      if (item.x >= bounds[0] && item.z >= bounds[1] && item.x <= bounds[2] && item.z <= bounds[3]) {
        results.push(item);
      }
    });

    if (node.children) {
      node.children.forEach(child => this.recursiveQuery(child, bounds, results));
    }
  }

  private intersects(a: [number, number, number, number], b: [number, number, number, number]): boolean {
    return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
  }
}
