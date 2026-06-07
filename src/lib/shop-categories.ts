export interface ShopCategory {
  slug: string;
  label: string;
  icon: string;
  accent: string;
  description: string;
  featured: boolean;
  types: string[];
}

export const CATEGORIES: ShopCategory[] = [
  // ── High-traffic / featured ─────────────────────────────────────────────────
  {
    slug: "clothing-fashion",
    label: "Clothing & Fashion",
    icon: "👗",
    accent: "#ec4899",
    description: "Ready-to-wear, boutiques, tailors, and wholesale garments.",
    featured: true,
    types: ["Retail Store", "Boutique", "Tailor", "Wholesale", "Designer Studio", "Second-hand & Thrift"],
  },
  {
    slug: "food-groceries",
    label: "Food & Groceries",
    icon: "🛒",
    accent: "#16a34a",
    description: "Grocery stores, supermarkets, kiryana shops, and organic produce.",
    featured: true,
    types: ["Grocery Store", "Supermarket", "Kiryana Store", "Organic", "Wholesale", "Convenience Store"],
  },
  {
    slug: "electronics",
    label: "Electronics",
    icon: "💻",
    accent: "#2563eb",
    description: "Computers, TVs, cameras, and consumer electronics.",
    featured: true,
    types: ["Retail", "Wholesale", "Repair & Service", "Import & Distribution", "Online Only"],
  },
  {
    slug: "mobile-phones-accessories",
    label: "Mobile Phones & Accessories",
    icon: "📱",
    accent: "#7c3aed",
    description: "Smartphones, tablets, covers, chargers, and repair centres.",
    featured: true,
    types: ["Retail", "Repair & Service", "Wholesale", "Unlocking & Flashing", "Accessories Only"],
  },
  {
    slug: "furniture-home-decor",
    label: "Furniture & Home Decor",
    icon: "🛋️",
    accent: "#d97706",
    description: "Furniture showrooms, home décor, curtains, and bedding.",
    featured: true,
    types: ["Showroom", "Workshop & Carpenter", "Retail", "Import & Wholesale", "Custom Order"],
  },
  {
    slug: "jewellery-accessories",
    label: "Jewellery & Accessories",
    icon: "💎",
    accent: "#f59e0b",
    description: "Gold, silver, artificial jewellery, and fashion accessories.",
    featured: false,
    types: ["Jewellery Shop", "Artificial Jewellery", "Gold & Silver", "Watches", "Bags & Handbags"],
  },
  {
    slug: "sports-fitness",
    label: "Sports & Fitness",
    icon: "⚽",
    accent: "#0ea5e9",
    description: "Sports equipment, gym gear, outdoor and adventure supplies.",
    featured: false,
    types: ["Sports Shop", "Gym Equipment", "Outdoor & Adventure", "Cricket & Hockey", "Fitness Nutrition"],
  },
  {
    slug: "books-stationery",
    label: "Books & Stationery",
    icon: "📚",
    accent: "#0891b2",
    description: "Bookshops, stationery stores, and office supplies.",
    featured: false,
    types: ["Bookshop", "Stationery", "Office Supplies", "Educational Materials", "Art Supplies"],
  },
  {
    slug: "health-beauty",
    label: "Health & Beauty",
    icon: "💆",
    accent: "#db2777",
    description: "Salons, skincare, cosmetics, wellness, and personal care.",
    featured: false,
    types: ["Salon & Spa", "Skincare", "Cosmetics", "Hair Care", "Men's Grooming", "Wellness Products"],
  },
  {
    slug: "toys-games",
    label: "Toys & Games",
    icon: "🎮",
    accent: "#7c3aed",
    description: "Toys, board games, hobby kits, and outdoor play equipment.",
    featured: false,
    types: ["Toy Shop", "Hobby Shop", "Video Games", "Board Games", "Educational Toys"],
  },
  {
    slug: "hardware-tools",
    label: "Hardware & Tools",
    icon: "🔧",
    accent: "#64748b",
    description: "Hardware stores, power tools, construction materials.",
    featured: false,
    types: ["Hardware Store", "Power Tools", "Construction Materials", "Tool Rental", "Wholesale"],
  },
  {
    slug: "auto-parts",
    label: "Auto Parts",
    icon: "🚗",
    accent: "#dc2626",
    description: "Auto parts, tyres, lubricants, and vehicle accessories.",
    featured: false,
    types: ["Auto Parts Store", "Tyre Shop", "Lubricants & Oils", "Car Accessories", "Motorcycle Parts", "Wholesale"],
  },
  {
    slug: "bakery-confectionery",
    label: "Bakery & Confectionery",
    icon: "🎂",
    accent: "#b45309",
    description: "Bakeries, mithai shops, cake studios, and sweet makers.",
    featured: false,
    types: ["Bakery", "Mithai Shop", "Cake & Cupcake Studio", "Dry Fruit & Nuts", "Wholesale"],
  },
  {
    slug: "pharmacy-medical",
    label: "Pharmacy & Medical",
    icon: "💊",
    accent: "#059669",
    description: "Pharmacies, medical supplies, and healthcare equipment.",
    featured: false,
    types: ["Pharmacy", "Medical Supplies", "Healthcare Equipment", "Surgical Instruments", "Lab Reagents"],
  },

  // ── Pakistan industry additions ──────────────────────────────────────────────
  {
    slug: "agriculture-farming",
    label: "Agriculture & Farming",
    icon: "🌾",
    accent: "#65a30d",
    description: "Seeds, fertilisers, pesticides, farm equipment, and livestock supplies.",
    featured: false,
    types: ["Seeds & Fertilisers", "Farm Equipment", "Pesticides & Herbicides", "Livestock Supplies", "Irrigation Equipment", "Wholesale Produce"],
  },
  {
    slug: "garments-textiles",
    label: "Garments & Textiles",
    icon: "🧵",
    accent: "#e11d48",
    description: "Fabric, cloth, embroidery, stitching accessories, and garment manufacturing.",
    featured: true,
    types: ["Fabric & Cloth", "Ready-Made Garments", "Embroidery & Lace", "Wholesale Textiles", "Export Quality", "Stitching Accessories"],
  },
  {
    slug: "electrical-lighting",
    label: "Electrical & Lighting",
    icon: "💡",
    accent: "#eab308",
    description: "Electrical components, wiring, lighting fixtures, and solar solutions.",
    featured: false,
    types: ["Electrical Components", "Lighting Fixtures", "Wiring & Cables", "Solar & UPS", "Industrial Electrical", "Wholesale"],
  },
  {
    slug: "plumbing-sanitary",
    label: "Plumbing & Sanitary",
    icon: "🚿",
    accent: "#0284c7",
    description: "Pipes, fittings, sanitary ware, tiles, and bathroom fittings.",
    featured: false,
    types: ["Pipes & Fittings", "Sanitary Ware", "Tiles & Flooring", "Bathroom Fittings", "Water Tanks", "Wholesale"],
  },
  {
    slug: "footwear-shoes",
    label: "Footwear & Shoes",
    icon: "👟",
    accent: "#92400e",
    description: "Shoes, sandals, chappal, sports footwear, and leather goods.",
    featured: false,
    types: ["Retail Store", "Sports Footwear", "Formal & Dress Shoes", "Kids Footwear", "Chappal & Sandals", "Wholesale"],
  },
  {
    slug: "wedding-events",
    label: "Wedding & Events",
    icon: "💒",
    accent: "#be185d",
    description: "Wedding décor, catering, photography, event management, and bridal wear.",
    featured: true,
    types: ["Bridal Wear", "Event Décor", "Catering", "Photography & Videography", "Wedding Invitations", "Event Management"],
  },
  {
    slug: "kids-baby",
    label: "Kids & Baby",
    icon: "🍼",
    accent: "#f97316",
    description: "Baby care, children's clothing, school bags, prams, and nursery supplies.",
    featured: false,
    types: ["Baby Care & Nursery", "Children's Clothing", "School Supplies", "Prams & Strollers", "Feeding & Nursing", "Educational Toys"],
  },
  {
    slug: "pets-animals",
    label: "Pets & Animals",
    icon: "🐾",
    accent: "#78350f",
    description: "Pet food, accessories, veterinary supplies, and live animals.",
    featured: false,
    types: ["Pet Food", "Pet Accessories", "Veterinary Supplies", "Birds & Aquarium", "Live Animals", "Grooming Products"],
  },
  {
    slug: "art-crafts",
    label: "Art & Crafts",
    icon: "🎨",
    accent: "#9333ea",
    description: "Art supplies, handmade crafts, calligraphy, and creative materials.",
    featured: false,
    types: ["Art Supplies", "Handmade Crafts", "Calligraphy", "Pottery & Clay", "Fabric Art", "Framing & Canvas"],
  },
  {
    slug: "musical-instruments",
    label: "Musical Instruments",
    icon: "🎸",
    accent: "#7c2d12",
    description: "Guitars, dhol, tabla, keyboards, studio equipment, and repair services.",
    featured: false,
    types: ["Traditional Instruments", "Western Instruments", "Studio Equipment", "Repair & Tuning", "Music Books & Sheets"],
  },
  {
    slug: "steel-metal",
    label: "Steel & Metal",
    icon: "⚙️",
    accent: "#475569",
    description: "Steel rods, sheets, gates, grills, fabrication, and metal wholesale.",
    featured: false,
    types: ["Steel Rods & Bars", "Metal Sheets", "Gates & Grills", "Fabrication Workshop", "Wholesale Dealer", "Scrap & Recycling"],
  },
  {
    slug: "printing-packaging",
    label: "Printing & Packaging",
    icon: "📦",
    accent: "#0f766e",
    description: "Flex printing, packaging boxes, branding, and signage.",
    featured: false,
    types: ["Flex & Banner Printing", "Packaging Boxes", "Branding & Signage", "Visiting Cards & Stationery", "Digital Printing", "Screen Printing"],
  },
  {
    slug: "cosmetics-salon",
    label: "Cosmetics & Salon",
    icon: "💄",
    accent: "#be123c",
    description: "Beauty salons, makeup brands, hair products, and nail art studios.",
    featured: false,
    types: ["Beauty Salon", "Nail Art Studio", "Makeup & Cosmetics", "Hair Products", "Henna & Mehndi", "Wholesale Beauty Products"],
  },
  {
    slug: "optical-eyewear",
    label: "Optical & Eyewear",
    icon: "👓",
    accent: "#1d4ed8",
    description: "Prescription glasses, sunglasses, contact lenses, and eye care.",
    featured: false,
    types: ["Optical Shop", "Sunglasses", "Contact Lenses", "Eye Care Clinic", "Sports Eyewear"],
  },
  {
    slug: "organic-natural",
    label: "Organic & Natural",
    icon: "🌿",
    accent: "#15803d",
    description: "Organic food, herbal products, natural remedies, and eco-friendly goods.",
    featured: false,
    types: ["Organic Food", "Herbal Products", "Natural Remedies", "Eco-friendly Goods", "Honey & Superfoods"],
  },
  {
    slug: "other",
    label: "Other",
    icon: "🏪",
    accent: "#6b7280",
    description: "General stores and shops that don't fit a specific category.",
    featured: false,
    types: ["General Store", "Multi-category", "Other"],
  },
];

export const CATEGORY_BY_LABEL: Record<string, ShopCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label, c])
);

export const CATEGORY_BY_SLUG: Record<string, ShopCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);

export function isValidCategory(label: string): boolean {
  return label in CATEGORY_BY_LABEL;
}

export function isValidType(categoryLabel: string, type: string): boolean {
  const cat = CATEGORY_BY_LABEL[categoryLabel];
  return cat ? cat.types.includes(type) : false;
}

export function getTypesForCategory(label: string): string[] {
  return CATEGORY_BY_LABEL[label]?.types ?? CATEGORY_BY_LABEL["Other"]!.types;
}

export function getCategoryIcon(label: string): string {
  return CATEGORY_BY_LABEL[label]?.icon ?? "🏪";
}
