import type { TryOnItem, TryOnMode } from '../types';

export const ITEMS: TryOnItem[] = [
  // Glasses
  { id: 'wayfarer',  name: 'Wayfarer',   category: 'glasses', thumbnail: '', colors: ['#1a1a2e','#8B4513','#1a1a8c','#c0392b','#2c2c2c','#f5e6d3'] },
  { id: 'round',     name: 'Round',      category: 'glasses', thumbnail: '', colors: ['#2c2c2c','#c8a96e','#1a1a8c','#4a4a4a','#8B4513','#e8d5b7'] },
  { id: 'cateye',    name: 'Cat-Eye',    category: 'glasses', thumbnail: '', colors: ['#1a1a2e','#c0392b','#8e44ad','#2c2c2c','#1a5276','#f39c12'] },
  { id: 'aviator',   name: 'Aviator',    category: 'glasses', thumbnail: '', colors: ['#c8a96e','#aaaaaa','#2c2c2c','#b7b7b7','#8B4513','#d4af37'] },
  { id: 'square',    name: 'Square',     category: 'glasses', thumbnail: '', colors: ['#1a1a2e','#2c2c2c','#8B4513','#1a5276','#4a235a','#145a32'] },
  { id: 'sporty',    name: 'Sporty',     category: 'glasses', thumbnail: '', colors: ['#1a1a2e','#e74c3c','#27ae60','#2980b9','#f39c12','#2c2c2c'] },
  // Makeup
  { id: 'classic-lip',  name: 'Classic Lip',  category: 'makeup', thumbnail: '', colors: ['#c0392b','#a93226','#7b241c','#e74c3c','#ff6b9d','#8e44ad'] },
  { id: 'glam',         name: 'Full Glam',    category: 'makeup', thumbnail: '', colors: ['#c0392b','#e74c3c','#d35400','#8e44ad','#2471a3','#117a65'] },
  { id: 'blush',        name: 'Soft Blush',   category: 'makeup', thumbnail: '', colors: ['#f1948a','#f0b27a','#c39bd3','#7fb3d3','#76d7c4','#f8c8a5'] },
  { id: 'smokey',       name: 'Smokey Eye',   category: 'makeup', thumbnail: '', colors: ['#2c2c2c','#1a1a2e','#4a235a','#1a5276','#145a32','#6e2f1a'] },
  { id: 'liner',        name: 'Bold Liner',   category: 'makeup', thumbnail: '', colors: ['#1a1a2e','#2c2c2c','#1a5276','#4a235a','#145a32','#7b241c'] },
  { id: 'nude',         name: 'Nude',         category: 'makeup', thumbnail: '', colors: ['#d4a590','#c49a85','#b58878','#a07060','#926050','#845040'] },
  { id: 'ombre-lip',    name: 'Ombré Lip',    category: 'makeup', thumbnail: '', colors: ['#c0392b','#e74c3c','#8e44ad','#2471a3','#d35400','#117a65'] },
  { id: 'contour',      name: 'Contour',      category: 'makeup', thumbnail: '', colors: ['#9b7653','#875f3e','#7a5230','#6b4226','#5d361d','#503015'] },
  // Clothing
  { id: 'tshirt',    name: 'T-Shirt',    category: 'clothing', thumbnail: '', colors: ['#2c3e50','#e74c3c','#27ae60','#2980b9','#f39c12','#8e44ad','#ecf0f1','#1a1a2e'] },
  { id: 'hoodie',    name: 'Hoodie',     category: 'clothing', thumbnail: '', colors: ['#2c3e50','#7f8c8d','#e74c3c','#27ae60','#2980b9','#f39c12','#ecf0f1','#1a1a2e'] },
  { id: 'jacket',    name: 'Jacket',     category: 'clothing', thumbnail: '', colors: ['#1a1a2e','#2c3e50','#6e2f1a','#1a5276','#145a32','#4a235a','#4d4d4d','#2c2c2c'] },
  { id: 'dress',     name: 'Dress',      category: 'clothing', thumbnail: '', colors: ['#c0392b','#8e44ad','#2471a3','#117a65','#d35400','#1a1a2e','#f8c8a5','#e8d5b7'] },
  // Accessories
  { id: 'watch',    name: 'Watch',    category: 'accessories', thumbnail: '', colors: ['#1a1a2e','#d4af37','#c0c0c0','#8B4513','#2c3e50','#1a5276'] },
  { id: 'rings',    name: 'Ring',     category: 'accessories', thumbnail: '', colors: ['#d4af37','#c0c0c0','#e74c3c','#8e44ad','#27ae60','#2980b9'] },
  { id: 'necklace', name: 'Necklace', category: 'accessories', thumbnail: '', colors: ['#d4af37','#c0c0c0','#c0392b','#8e44ad','#2980b9','#1a1a2e'] },
];

export const getItemsByMode = (mode: TryOnMode) =>
  ITEMS.filter(i => i.category === mode);
