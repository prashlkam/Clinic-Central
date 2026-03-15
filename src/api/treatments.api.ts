const invoke = window.electronAPI.invoke;

export const treatmentsApi = {
  listTrees: () => invoke('treatments:listTrees'),
  getTreeWithTreatments: (treeId: number) => invoke('treatments:getTreeWithTreatments', treeId),
  getAllFlat: () => invoke('treatments:getAllFlat'),
  getByTree: (treeId: number) => invoke('treatments:getByTree', treeId),
  getById: (id: number) => invoke('treatments:getById', id),
  create: (data: any) => invoke('treatments:create', data),
  update: (id: number, data: any) => invoke('treatments:update', id, data),
  delete: (id: number) => invoke('treatments:delete', id),
  createTree: (name: string, desc?: string) => invoke('treatments:createTree', name, desc),
  deleteTree: (id: number) => invoke('treatments:deleteTree', id),
  importFile: () => invoke('treatments:importFile'),
  importContent: (content: string) => invoke('treatments:importContent', content),
  clearAll: () => invoke('treatments:clearAll'),
};
