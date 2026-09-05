/** Seed data — 6 categories, 27 products (prices in integer cents). */

export const CATEGORIES = [
  { name: "Electronics", slug: "electronics", description: "Audio, chargers, and everyday tech" },
  { name: "Apparel", slug: "apparel", description: "Tees, hoodies, and caps" },
  { name: "Home", slug: "home", description: "Kitchen, decor, and organization" },
  { name: "Fitness", slug: "fitness", description: "Training gear and recovery" },
  { name: "Books", slug: "books", description: "Programming, design, and business" },
  { name: "Accessories", slug: "accessories", description: "Bags, wallets, and small carry" },
];

export interface SeedProduct {
  name: string;
  price: number;
  compareAt?: number;
  category: string;
  featured?: boolean;
  stock: number;
  description: string;
}

export const PRODUCTS: SeedProduct[] = [
  // Electronics (one stock=1, one stock=0)
  { name: "Aurora Wireless Headphones", price: 12999, compareAt: 17999, category: "electronics", featured: true, stock: 24, description: "<p>Over-ear Bluetooth headphones with 40-hour battery, adaptive noise cancelling, and USB-C fast charge.</p>" },
  { name: "Pulse Mechanical Keyboard", price: 9900, category: "electronics", featured: true, stock: 15, description: "<p>Hot-swappable 75% mechanical keyboard with gasket mount and PBT keycaps.</p>" },
  { name: "Nimbus 65W GaN Charger", price: 3900, category: "electronics", stock: 60, description: "<p>Two-port GaN charger that powers a laptop and a phone at once, pocket-sized.</p>" },
  { name: "Orbit Bluetooth Speaker", price: 5900, category: "electronics", stock: 33, description: "<p>IPX7 waterproof speaker with 360° sound and 18-hour playtime.</p>" },
  { name: "Vantage 4K Webcam", price: 7400, category: "electronics", stock: 1, description: "<p>4K30 webcam with on-device framing and a physical privacy shutter. Last unit.</p>" },
  { name: "Helios Smart Bulb 4-Pack", price: 4400, category: "electronics", stock: 0, description: "<p>Warm-to-cool white dimmable smart bulbs, works with every major assistant.</p>" },
  // Apparel
  { name: "Fieldwork Canvas Jacket", price: 8900, category: "apparel", stock: 18, description: "<p>Waxed-canvas work jacket with brass hardware and fleece-lined pockets.</p>" },
  { name: "Meridian Logo Tee", price: 2400, category: "apparel", stock: 80, description: "<p>Heavyweight combed-cotton tee with a small embroidered logo.</p>" },
  { name: "Trailhead Fleece Hoodie", price: 6400, compareAt: 7900, category: "apparel", stock: 42, description: "<p>Brushed fleece hoodie with a kangaroo pocket and ribbed cuffs.</p>" },
  { name: "Summit Five-Panel Cap", price: 2900, category: "apparel", stock: 55, description: "<p>Low-profile five-panel cap in ripstop with an adjustable strap.</p>" },
  // Home
  { name: "Ember Pour-Over Kettle", price: 6900, category: "home", featured: true, stock: 20, description: "<p>Gooseneck kettle with a precision flow spout and thermometer lid.</p>" },
  { name: "Loft Ceramic Vase", price: 3400, category: "home", stock: 26, description: "<p>Hand-glazed stoneware vase with a matte speckled finish.</p>" },
  { name: "Haven Linen Duvet Cover", price: 11900, compareAt: 14900, category: "home", stock: 12, description: "<p>Stonewashed European flax linen duvet that softens with every wash.</p>" },
  { name: "Tidy Stackable Organizers", price: 2200, category: "home", stock: 70, description: "<p>Set of four modular bamboo organizers for drawers and desks.</p>" },
  { name: "Drift Soy Candle Trio", price: 2800, category: "home", stock: 0, description: "<p>Cedar, amber, and sea-salt soy candles with 40-hour burns.</p>" },
  // Fitness
  { name: "Iron Grip Kettlebell 16kg", price: 7900, category: "fitness", stock: 14, description: "<p>Powder-coated cast-iron kettlebell with a wide, chalk-friendly handle.</p>" },
  { name: "Flow Cork Yoga Mat", price: 5400, category: "fitness", stock: 30, description: "<p>Cork-and-rubber mat with grip that improves as you sweat.</p>" },
  { name: "Sprint Adjustable Jump Rope", price: 1900, category: "fitness", stock: 90, description: "<p>Bearing-driven speed rope with quick-length cable locks.</p>" },
  { name: "Peak Foam Roller", price: 3200, category: "fitness", stock: 25, description: "<p>Density-graduated EVA roller for pre-workout prep and recovery.</p>" },
  // Books
  { name: "Designing Data-Intensive Applications", price: 4500, category: "books", featured: true, stock: 35, description: "<p>The definitive guide to the data infrastructure behind modern systems.</p>" },
  { name: "The Pragmatic Programmer (20th Anniversary)", price: 3900, category: "books", stock: 28, description: "<p>Timeless advice on craftsmanship, career, and shipping software.</p>" },
  { name: "Refactoring UI", price: 2900, category: "books", stock: 22, description: "<p>Practical visual design tactics for developers building products.</p>" },
  { name: "Shape Up", price: 1900, category: "books", stock: 40, description: "<p>A better way to plan product work: six-week cycles, shaped bets.</p>" },
  // Accessories
  { name: "Carry Slim Wallet", price: 4900, category: "accessories", stock: 45, description: "<p>Full-grain leather wallet with quick-access card slots and RFID shielding.</p>" },
  { name: "Transit 18L Backpack", price: 8400, compareAt: 9900, category: "accessories", stock: 16, description: "<p>Weather-resistant commuter pack with a 16-inch laptop sleeve.</p>" },
  { name: "Anchor Cable Set", price: 1600, category: "accessories", stock: 100, description: "<p>Three braided USB-C cables (0.3m, 1m, 2m) rated for 100W.</p>" },
  { name: "Voyage Packing Cubes", price: 2600, category: "accessories", stock: 1, description: "<p>Four-piece packing cube set with compression zips. Last unit.</p>" },
];
