import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  // Regions: Lahore sub-areas
  const lahoreRegions = [
    { name: "DHA Phase 1", nameUr: "ڈی ایچ ا۔ فیز 1", slug: "lahore-dha-1", lat: 31.4697, lng: 74.4073 },
    { name: "DHA Phase 2", nameUr: "ڈی ایچ ا۔ فیز 2", slug: "lahore-dha-2", lat: 31.4776, lng: 74.3975 },
    { name: "DHA Phase 3", nameUr: "ڈی ایچ ا۔ فیز 3", slug: "lahore-dha-3", lat: 31.4812, lng: 74.3842 },
    { name: "DHA Phase 4", nameUr: "ڈی ایچ ا۔ فیز 4", slug: "lahore-dha-4", lat: 31.4698, lng: 74.3724 },
    { name: "DHA Phase 5", nameUr: "ڈی ایچ ا۔ فیز 5", slug: "lahore-dha-5", lat: 31.4619, lng: 74.3621 },
    { name: "DHA Phase 6", nameUr: "ڈی ایچ ا۔ فیز 6", slug: "lahore-dha-6", lat: 31.4512, lng: 74.3543 },
    { name: "DHA Phase 7", nameUr: "ڈی ایچ ا۔ فیز 7", slug: "lahore-dha-7", lat: 31.4423, lng: 74.3467 },
    { name: "DHA Phase 8", nameUr: "ڈی ایچ ا۔ فیز 8", slug: "lahore-dha-8", lat: 31.4334, lng: 74.3389 },
    { name: "Bahria Town", nameUr: "بحریہ ٹاؤن", slug: "lahore-bahria-town", lat: 31.3627, lng: 74.1754 },
    { name: "Gulberg", nameUr: "گلبرگ", slug: "lahore-gulberg", lat: 31.5091, lng: 74.342 },
    { name: "Johar Town", nameUr: "جوہر ٹاؤن", slug: "lahore-johar-town", lat: 31.4692, lng: 74.2738 },
    { name: "Model Town", nameUr: "ماڈل ٹاؤن", slug: "lahore-model-town", lat: 31.4851, lng: 74.3148 },
    { name: "Cantt", nameUr: "کینٹ", slug: "lahore-cantt", lat: 31.5204, lng: 74.3587 },
    { name: "Iqbal Town", nameUr: "اقبال ٹاؤن", slug: "lahore-iqbal-town", lat: 31.4913, lng: 74.2958 },
    { name: "Faisal Town", nameUr: "فیصل ٹاؤن", slug: "lahore-faisal-town", lat: 31.5024, lng: 74.2847 },
    { name: "Wapda Town", nameUr: "واپڈا ٹاؤن", slug: "lahore-wapda-town", lat: 31.4571, lng: 74.2614 },
    { name: "Valencia", nameUr: "ویلنشیا", slug: "lahore-valencia", lat: 31.5312, lng: 74.3124 },
  ];

  const createdRegions: Record<string, string> = {};

  for (const region of lahoreRegions) {
    const r = await prisma.region.upsert({
      where: { slug: region.slug },
      update: {},
      create: { ...region, city: "Lahore", country: "PK" },
    });
    createdRegions[region.slug] = r.id;
  }
  console.log(`Created ${lahoreRegions.length} regions`);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { phone: "+92-300-0000000" },
    update: {},
    create: {
      phone: "+92-300-0000000",
      name: "Xplosale Admin",
      role: "ADMIN",
      isPhoneVerified: true,
      verificationStatus: "VERIFIED",
      defaultRegionId: createdRegions["lahore-gulberg"],
    },
  });
  console.log(`Admin user: ${admin.id}`);

  // Verified seller
  const sellerUser = await prisma.user.upsert({
    where: { phone: "+92-301-1111111" },
    update: {},
    create: {
      phone: "+92-301-1111111",
      name: "Ahmed Raza",
      role: "USER",
      isPhoneVerified: true,
      verificationStatus: "VERIFIED",
      defaultRegionId: createdRegions["lahore-dha-5"],
    },
  });

  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      agentTier: "PRO",
      bio: "Experienced real estate agent in DHA Lahore",
    },
  });

  const listingData = [
    {
      category: "real_estate",
      title: "5 Marla House in DHA Phase 5",
      description: "Beautiful 5 marla house with 3 beds, 2 baths, modern kitchen, covered parking.",
      price: 25000000,
      propertyType: "HOUSE" as const,
      beds: 3,
      baths: 2,
      areaValue: 5,
      areaUnit: "Marla",
      regionSlug: "lahore-dha-5",
      lat: 31.4619,
      lng: 74.3621,
    },
    {
      category: "real_estate",
      title: "10 Marla Corner Plot — Bahria Town",
      description: "Prime corner plot, possession clear, all utilities available.",
      price: 18000000,
      propertyType: "PLOT" as const,
      areaValue: 10,
      areaUnit: "Marla",
      regionSlug: "lahore-bahria-town",
      lat: 31.3627,
      lng: 74.1754,
    },
    {
      category: "real_estate",
      title: "2 Bed Apartment — Gulberg",
      description: "Fully furnished apartment on 3rd floor with elevator, 24/7 security.",
      price: 12500000,
      propertyType: "APARTMENT" as const,
      beds: 2,
      baths: 2,
      areaValue: 1000,
      areaUnit: "sqft",
      regionSlug: "lahore-gulberg",
      lat: 31.5091,
      lng: 74.342,
    },
    {
      category: "real_estate",
      title: "Commercial Shop — Model Town",
      description: "Ground floor commercial shop, ideal for retail, high foot traffic.",
      price: 9000000,
      propertyType: "COMMERCIAL" as const,
      areaValue: 200,
      areaUnit: "sqft",
      regionSlug: "lahore-model-town",
      lat: 31.4851,
      lng: 74.3148,
    },
  ];

  const existingListingCount = await prisma.listing.count({ where: { sellerProfileId: sellerProfile.id } });
  if (existingListingCount === 0) {
    for (const l of listingData) {
      await prisma.listing.create({
        data: {
          sellerProfileId: sellerProfile.id,
          category: l.category,
          title: l.title,
          description: l.description,
          price: l.price,
          currency: "PKR",
          regionId: createdRegions[l.regionSlug],
          lat: l.lat,
          lng: l.lng,
          status: "ACTIVE",
          propertyType: l.propertyType,
          beds: (l as { beds?: number }).beds,
          baths: (l as { baths?: number }).baths,
          areaValue: l.areaValue,
          areaUnit: l.areaUnit,
          fbrValuationMin: l.price * 0.85,
          fbrValuationMax: l.price * 1.15,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log(`Created 4 listings`);
  } else {
    console.log(`Skipped listings — already seeded`);
  }

  // Verified employer + company + job postings
  const employerUser = await prisma.user.upsert({
    where: { phone: "+92-302-2222222" },
    update: {},
    create: {
      phone: "+92-302-2222222",
      name: "Sara Khan",
      role: "EMPLOYER",
      isPhoneVerified: true,
      verificationStatus: "VERIFIED",
      defaultRegionId: createdRegions["lahore-cantt"],
    },
  });

  let company = await prisma.company.findFirst({ where: { ownerId: employerUser.id } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        ownerId: employerUser.id,
        name: "TechPakistan Pvt. Ltd.",
        industry: "Technology",
        size: "50-200",
        websiteUrl: "https://techpakistan.example",
        regionId: createdRegions["lahore-cantt"],
        verifiedEmployer: true,
      },
    });
  }

  await prisma.employerProfile.upsert({
    where: { userId: employerUser.id },
    update: {},
    create: {
      userId: employerUser.id,
      companyId: company.id,
      roleAtCompany: "HR Manager",
    },
  });

  const existingJobCount = await prisma.jobPosting.count({ where: { companyId: company.id } });
  if (existingJobCount === 0) {
    await prisma.jobPosting.createMany({
      data: [
        {
          companyId: company.id,
          postedByUserId: employerUser.id,
          title: "Senior Full-Stack Engineer",
          description: "We are looking for a senior engineer with 5+ years of experience in Node.js and React.",
          regionId: createdRegions["lahore-cantt"],
          remoteType: "HYBRID",
          salaryMin: 200000,
          salaryMax: 350000,
          currency: "PKR",
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        {
          companyId: company.id,
          postedByUserId: employerUser.id,
          title: "UI/UX Designer",
          description: "Creative designer to lead product design. Figma expert, portfolio required.",
          regionId: createdRegions["lahore-cantt"],
          remoteType: "ONSITE",
          salaryMin: 120000,
          salaryMax: 200000,
          currency: "PKR",
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      ],
    });
  }
  console.log(`Created employer + company + 2 job postings`);

  // Verified network profile
  const networkUser = await prisma.user.upsert({
    where: { phone: "+92-303-3333333" },
    update: {},
    create: {
      phone: "+92-303-3333333",
      name: "Bilal Ahmed",
      role: "USER",
      isPhoneVerified: true,
      verificationStatus: "VERIFIED",
      defaultRegionId: createdRegions["lahore-gulberg"],
    },
  });

  const networkProfile = await prisma.networkProfile.upsert({
    where: { userId: networkUser.id },
    update: {},
    create: {
      userId: networkUser.id,
      handle: "bilalahmed",
      headline: "Software Engineer | React | Node.js | Lahore",
      summary: "Passionate developer building products for Pakistan.",
      currentRole: "Senior Engineer at StartupPK",
      location: "Lahore, PK",
      visibility: "PUBLIC",
      verifiedProfessional: true,
    },
  });

  // 2 posts
  const existingPostCount = await prisma.post.count({ where: { authorProfileId: networkProfile.id } });
  if (existingPostCount === 0) {
    await prisma.post.createMany({
      data: [
        {
          authorProfileId: networkProfile.id,
          body: "Excited to join Xplosale as a verified professional! Pakistan's tech scene is growing fast",
        },
        {
          authorProfileId: networkProfile.id,
          body: "Great talk at LUMS today on building scalable APIs. Key takeaway: measure before optimizing.",
        },
      ],
    });
  }

  // 5 connection users
  const connectionNames = ["Aisha Malik", "Usman Tariq", "Fatima Noor", "Hamza Shah", "Zainab Qureshi"];
  const connectionPhones = ["+92-304-4444444", "+92-305-5555555", "+92-306-6666666", "+92-307-7777777", "+92-308-8888888"];

  const connectionHandles = ["aishamalik", "usmantariq", "fatimanoor", "hamzashah", "zainabqureshi"];

  for (let i = 0; i < 5; i++) {
    const connUser = await prisma.user.upsert({
      where: { phone: connectionPhones[i] },
      update: {},
      create: {
        phone: connectionPhones[i],
        name: connectionNames[i],
        role: "USER",
        isPhoneVerified: true,
        verificationStatus: "VERIFIED",
        defaultRegionId: createdRegions["lahore-gulberg"],
      },
    });

    // Create NetworkProfile for each connection user so profile links work
    await prisma.networkProfile.upsert({
      where: { userId: connUser.id },
      update: {},
      create: {
        userId: connUser.id,
        handle: connectionHandles[i],
        headline: `Professional in Lahore`,
        visibility: "PUBLIC",
      },
    });

    // Check both directions before inserting to enforce bidirectional uniqueness
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: networkUser.id, recipientId: connUser.id },
          { requesterId: connUser.id, recipientId: networkUser.id },
        ],
      },
    });
    if (!existing) {
      await prisma.connection.create({
        data: {
          requesterId: networkUser.id,
          recipientId: connUser.id,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
    }
  }

  console.log(`Created network profile + 2 posts + 5 connections`);

  // ── Plans ──
  await prisma.plan.upsert({
    where: { key: "FREE" },
    update: { maxProducts: 2 },
    create: {
      key: "FREE",
      name: "Free",
      priceMonthly: 0,
      currency: "PKR",
      maxShops: 1,
      maxProducts: 2,
      maxImagesPerProduct: 2,
      featuredPlacement: false,
      analytics: false,
      customBanner: false,
    },
  });

  await prisma.plan.upsert({
    where: { key: "PREMIUM" },
    update: {},
    create: {
      key: "PREMIUM",
      name: "Premium",
      priceMonthly: 1500,
      currency: "PKR",
      maxShops: 5,
      maxProducts: 30,
      maxImagesPerProduct: 5,
      featuredPlacement: true,
      analytics: true,
      customBanner: true,
    },
  });

  await prisma.plan.upsert({
    where: { key: "PROMOTION" },
    update: {},
    create: {
      key: "PROMOTION",
      name: "Promotion",
      priceMonthly: 2500,
      currency: "PKR",
      maxShops: 5,
      maxProducts: 50,
      maxImagesPerProduct: 8,
      featuredPlacement: true,
      analytics: true,
      customBanner: true,
    },
  });

  console.log("Seeded FREE + PREMIUM + PROMOTION plans");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
