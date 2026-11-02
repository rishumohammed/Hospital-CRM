import { prisma } from './client';

export async function seedProductModule() {
  console.log('--- Starting Product Module Seed ---');

  // 1. Get references
  const mainBranch = await prisma.branch.findUnique({ where: { code: 'MAIN' } });
  const adminUser = await prisma.user.findFirst({ where: { role: { code: 'admin' } } });
  const prodMgr = (await prisma.user.findFirst({ where: { email: 'prod_mgr@hospital.test' } })) || adminUser;
  const prodCaller = (await prisma.user.findFirst({ where: { email: 'prod_caller@hospital.test' } })) || adminUser;
  const ayurDept = await prisma.department.findFirst({ where: { code: 'AYURVEDA' } }) || await prisma.department.findFirst();
  const metaSource = await prisma.source.findFirst({ where: { code: 'META_ADS' } }) || await prisma.source.findFirst();
  const lostReasonPrice = await prisma.lostReason.findFirst({ where: { code: 'PRICE' } }) || await prisma.lostReason.findFirst();

  if (!mainBranch || !adminUser || !prodMgr || !prodCaller || !ayurDept || !metaSource) {
    throw new Error('Prerequisite seed data missing (branch, users, departments, sources). Run main seed first.');
  }

  // 2. Product Categories (Root & Subcategories)
  const categoryDefs = [
    { code: 'CAT_OILS', name: 'Ayurvedic Oils & Thailams', description: 'Traditional herbal medicated oils for external application', parentCode: null },
    { code: 'CAT_KASHAYAMS', name: 'Concentrated Decoctions', description: 'Water-based classical Ayurvedic herbal decoctions', parentCode: null },
    { code: 'CAT_CHURNAMS', name: 'Medicinal Herbal Powders', description: 'Finely ground poly-herbal and single herb powders', parentCode: null },
    { code: 'CAT_GHRITHAMS', name: 'Medicated Ghee Formulations', description: 'Ghee infused with potent rejuvenating herbs', parentCode: null },
    { code: 'CAT_GULIKAS', name: 'Classical Herbal Tablets', description: 'Standardized classical gulikas, guggulus, and vatis', parentCode: null },
    // Subcategories
    { code: 'CAT_JOINT_OILS', name: 'Joint & Muscle Pain Oils', description: 'Specialized thailams for arthritis, swelling, and spine care', parentCode: 'CAT_OILS' },
    { code: 'CAT_HAIR_OILS', name: 'Scalp & Hair Vitality Oils', description: 'Classical herbal oils for hair fall and cooling the head', parentCode: 'CAT_OILS' },
    { code: 'CAT_IMMUNITY_KASH', name: 'Immunity & Respiratory Decoctions', description: 'Formulations for seasonal fever, cough, and vitality', parentCode: 'CAT_KASHAYAMS' },
    { code: 'CAT_DIGESTIVE_KASH', name: 'Digestive & Gut Health Decoctions', description: 'Formulations for metabolism, bloating, and detox', parentCode: 'CAT_KASHAYAMS' },
  ];

  const categoriesByCode: Record<string, any> = {};

  // First pass: Roots
  for (const cat of categoryDefs.filter(c => !c.parentCode)) {
    const slug = cat.code.toLowerCase().replace(/_/g, '-');
    categoriesByCode[cat.code] = await prisma.productCategory.upsert({
      where: { slug },
      update: { name: cat.name, description: cat.description, active: true },
      create: { slug, name: cat.name, description: cat.description, active: true },
    });
  }

  // Second pass: Subcategories
  for (const cat of categoryDefs.filter(c => c.parentCode)) {
    const parent = categoriesByCode[cat.parentCode!];
    const slug = cat.code.toLowerCase().replace(/_/g, '-');
    categoriesByCode[cat.code] = await prisma.productCategory.upsert({
      where: { slug },
      update: { name: cat.name, description: cat.description, parentId: parent?.id, active: true },
      create: { slug, name: cat.name, description: cat.description, parentId: parent?.id, active: true },
    });
  }
  console.log(`✓ Seeded ${Object.keys(categoriesByCode).length} Product Categories (2-level hierarchy)`);

  // 3. Products (20 classical Ayurvedic items)
  const productDefs = [
    {
      sku: 'AYUR-OIL-001',
      name: 'Murivenna Quick Healing Thailam',
      catCode: 'CAT_JOINT_OILS',
      mrp: 290.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '200ml Bottle',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Classical Kerala formulation renowned for rapid relief from acute sprains, soft tissue injuries, and muscle soreness.',
      howToUse: 'Apply gently over the affected area in a warm condition. Leave for 30 minutes before washing with warm water.',
      ingredients: 'Betel leaves, Moringa leaves, Shallots, Aloe vera in pure cold-pressed coconut oil base.',
      shortDescription: 'Rapid relief for acute sprains, muscle trauma, and minor cuts.',
    },
    {
      sku: 'AYUR-OIL-002',
      name: 'Dhanwantharam Kuzhampu Deep Tissue',
      catCode: 'CAT_JOINT_OILS',
      mrp: 540.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 45,
      packSize: '450ml Economy Pack',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Vata-pacifying heavy herbal formulation specially indicated for neuromuscular conditions, chronic back pain, and post-partum rejuvenation.',
      howToUse: 'Warm the oil and massage thoroughly from head to toe or over spine and joints.',
      ingredients: 'Bala (Sida cordifolia), Dashamoola, Yava, Kulattha in sesame oil, castor oil, and ghee base.',
      shortDescription: 'Deep tissue Vata relief for chronic spinal stiffness and post-rehabilitation.',
    },
    {
      sku: 'AYUR-OIL-003',
      name: 'Kottamchukkadi Thailam Anti-Inflammatory',
      catCode: 'CAT_JOINT_OILS',
      mrp: 320.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '200ml Bottle',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Powerful analgesic and anti-inflammatory oil tailored for localized joint inflammation, rheumatic pain, and sciatica.',
      howToUse: 'Warm slightly and massage with gentle upward strokes on inflamed joints.',
      ingredients: 'Kottam (Saussurea lappa), Chukku (Dry ginger), Vayambu, Garlic in sesame oil.',
      shortDescription: 'Reduces joint swelling, numbness, and rheumatic discomfort.',
    },
    {
      sku: 'AYUR-OIL-004',
      name: 'Sahacharadi Thailam Lumbar Support',
      catCode: 'CAT_JOINT_OILS',
      mrp: 360.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '200ml Bottle',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Specialized herbal oil for lower limb weakness, tremors, varicose heaviness, and lumbar disc compression.',
      howToUse: 'Massage over lower back and downward along hips and legs.',
      ingredients: 'Sahachara (Strobilanthes ciliatus), Dashamoola, Devadaru in pure sesame oil.',
      shortDescription: 'Nerve strengthening oil for lower back and leg mobility.',
    },
    {
      sku: 'AYUR-OIL-005',
      name: 'Neelibringadi Kera Thailam Hair Vitalizer',
      catCode: 'CAT_HAIR_OILS',
      mrp: 410.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 45,
      packSize: '250ml Glass Bottle',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Time-honored royal hair elixir prepared with fresh Neeli, Bringaraja, and coconut milk for deep root nourishment.',
      howToUse: 'Apply 10-15ml into scalp and gently massage with fingertips before bedtime or 45 mins before shower.',
      ingredients: 'Indigofera tinctoria, Eclipta alba, Cardiospermum, Amla, Coconut milk, Buffalo milk, Cow milk, Goat milk.',
      shortDescription: 'Premium Ayurvedic hair nourishment, prevents premature graying and hair thinning.',
    },
    {
      sku: 'AYUR-OIL-006',
      name: 'Kayyanyadi Thailam Cooling Scalp Elixir',
      catCode: 'CAT_HAIR_OILS',
      mrp: 340.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '200ml Bottle',
      status: 'approved',
      stockStatus: 'out_of_stock', // OOS for waitlist demonstration
      usageDescription: 'Cooling Pitta-pacifying hair oil recommended for stress-induced hair loss, split ends, and poor sleep.',
      howToUse: 'Apply on the crown of the head in the evening for deep relaxation and scalp cooling.',
      ingredients: 'Kayyonni (Bringaraja), Triphala, Guduchi, Cow milk in sesame oil.',
      shortDescription: 'Cools the head, relieves eye strain, and stops stress-related hair fall.',
    },
    {
      sku: 'AYUR-KASH-001',
      name: 'Amrutotharam Kashayam Immunity Booster',
      catCode: 'CAT_IMMUNITY_KASH',
      mrp: 220.00,
      taxPercent: 12.00,
      prescriptionRequired: false,
      refillDays: 20,
      packSize: '200ml Liquid Extract',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Ancient classical decoction of three powerhouse herbs for intermittent fever, viral flu, and loss of appetite.',
      howToUse: 'Dilute 15ml with 45ml lukewarm water twice daily on empty stomach.',
      ingredients: 'Amrita (Giloy), Haritaki, Shunthi (Dry ginger).',
      shortDescription: 'Foundational seasonal immunity, fever control, and gut detox.',
    },
    {
      sku: 'AYUR-KASH-002',
      name: 'Varanadi Kashayam Metabolic Detox',
      catCode: 'CAT_DIGESTIVE_KASH',
      mrp: 260.00,
      taxPercent: 12.00,
      prescriptionRequired: false,
      refillDays: 20,
      packSize: '200ml Liquid Extract',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Renowned for Kapha and Medas reduction, healthy lipid metabolism, and relieving sluggish digestion.',
      howToUse: '15ml mixed with 45ml boiled and cooled water 30 mins before breakfast and dinner.',
      ingredients: 'Varana (Crataeva nurvala), Sairyaka, Shatavari, Dahana, Bilva, Agnimantha.',
      shortDescription: 'Supports healthy metabolism, clears deep tissue toxins, and curbs bloating.',
    },
    {
      sku: 'AYUR-KASH-003',
      name: 'Maharasnadi Kashayam Joint Mobility',
      catCode: 'CAT_IMMUNITY_KASH',
      mrp: 310.00,
      taxPercent: 12.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '200ml Liquid Extract',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Master decoction containing 26 herbs for severe degenerative arthritis, frozen shoulder, and restricted joint movement.',
      howToUse: '15ml twice daily diluted with warm water, preferably with a pinch of ginger powder.',
      ingredients: 'Rasna, Dhanvayasa, Bala, Eranda, Devadaru, Punarnava, Guduchi.',
      shortDescription: 'Restores joint flexibility and combats degenerative musculoskeletal conditions.',
    },
    {
      sku: 'AYUR-KASH-004',
      name: 'Chiruvilwadi Kashayam Gastro Care',
      catCode: 'CAT_DIGESTIVE_KASH',
      mrp: 240.00,
      taxPercent: 12.00,
      prescriptionRequired: false,
      refillDays: 20,
      packSize: '200ml Liquid Extract',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Targeted formulation for hemorrhoids, sluggish bowels, flatulence, and burning indigestion.',
      howToUse: '15ml with 45ml lukewarm water twice daily before meals.',
      ingredients: 'Chiruvilwa (Holoptelea integrifolia), Punarnava, Vahni, Abhaya, Nagara.',
      shortDescription: 'Regulates bowel movements and soothes anorectal venous congestion.',
    },
    {
      sku: 'AYUR-CHUR-001',
      name: 'Triphala Churnam Digestive Colon Cleanse',
      catCode: 'CAT_CHURNAMS',
      mrp: 160.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '100g Airtight Jar',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'The pinnacle of classical Ayurvedic cleansing, balancing all three doshas while supporting gentle colon evacuation.',
      howToUse: '1 teaspoon (3-5g) stirred in a cup of lukewarm water or honey before sleep.',
      ingredients: 'Equal parts certified organic Haritaki, Bibhitaki, and Amalaki fruit rinds.',
      shortDescription: 'Gentle overnight bowel regulator, antioxidant, and digestive tonic.',
    },
    {
      sku: 'AYUR-CHUR-002',
      name: 'Avipathi Churnam Hyperacidity Relief',
      catCode: 'CAT_CHURNAMS',
      mrp: 190.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '100g Airtight Jar',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Sweet cooling herbal compound specifically designed to soothe acid peptic conditions, sour belching, and gastritis.',
      howToUse: '5-10g taken at bedtime with warm water or honey.',
      ingredients: 'Trikatu, Triphala, Musta, Vidanga, Ela, Patra, Lavanga, Trivrit, Sugar cane extract.',
      shortDescription: 'Rapid relief from acid reflux, heartburn, and constipation.',
    },
    {
      sku: 'AYUR-CHUR-003',
      name: 'Ashwagandha Churnam Stress & Vitality',
      catCode: 'CAT_CHURNAMS',
      mrp: 280.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '100g Airtight Jar',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Pure adaptogenic root powder for physical endurance, calm nervous system, stamina, and sound restful sleep.',
      howToUse: '1 teaspoon boiled in warm milk or water with organic jaggery at night.',
      ingredients: '100% pure organic Withania somnifera root micro-pulverized.',
      shortDescription: 'Calms anxiety, boosts stamina, and supports restorative sleep.',
    },
    {
      sku: 'AYUR-CHUR-004',
      name: 'Trikatu Churnam Bio-Enhancer & Metabolism',
      catCode: 'CAT_CHURNAMS',
      mrp: 175.00,
      taxPercent: 5.00,
      prescriptionRequired: false,
      refillDays: 30,
      packSize: '100g Jar',
      status: 'approved',
      stockStatus: 'out_of_stock', // OOS for testing waitlists
      usageDescription: 'The classic pungent trio that stimulates digestive fire (Agni), reduces mucosal congestion, and enhances nutrient bioavailability.',
      howToUse: '1-2g with pure honey before major meals.',
      ingredients: 'Black pepper, Long pepper (Pippali), and Dry ginger (Shunthi).',
      shortDescription: 'Kindles sluggish digestion and clears stubborn respiratory phlegm.',
    },
    {
      sku: 'AYUR-GHRI-001',
      name: 'Guggulutiktaka Ghritham Skin & Joint',
      catCode: 'CAT_GHRITHAMS',
      mrp: 490.00,
      taxPercent: 12.00,
      prescriptionRequired: true, // Rx Required
      refillDays: 30,
      packSize: '150g Jar',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'High-potency medicated cow ghee indicated for chronic dermatitis, psoriasis, fistula, and deep-seated joint inflammation.',
      howToUse: 'As directed by physician. Typical dose 5-10g with warm water on empty stomach.',
      ingredients: 'Nimba, Patola, Vyaghri, Guduchi, Vasa, Shuddha Guggulu, Cow ghee.',
      shortDescription: 'Doctor-prescribed therapeutic ghee for chronic skin and joint pathology.',
    },
    {
      sku: 'AYUR-GHRI-002',
      name: 'Brahmi Ghritham Neuro & Memory Tonic',
      catCode: 'CAT_GHRITHAMS',
      mrp: 520.00,
      taxPercent: 12.00,
      prescriptionRequired: true, // Rx Required
      refillDays: 30,
      packSize: '150g Jar',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Potent Medhya Rasayana formulation that crosses the blood-brain barrier to sharpen memory, focus, and soothe neuro-fatigue.',
      howToUse: 'Take 5g on an empty stomach in the morning followed by warm water.',
      ingredients: 'Bacopa monnieri fresh juice, Vacha, Shankhapushpi, Saptala, pure A2 Cow ghee.',
      shortDescription: 'Cognitive sharpener, combats brain fog, and calms central nervous system.',
    },
    {
      sku: 'AYUR-GHRI-003',
      name: 'Sukumaram Ghritham Female Rejuvenator',
      catCode: 'CAT_GHRITHAMS',
      mrp: 460.00,
      taxPercent: 12.00,
      prescriptionRequired: true, // Rx Required
      refillDays: 30,
      packSize: '150g Jar',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Nourishing classical ghee for female hormonal harmony, uterine wellness, PCOS, and chronic pelvic discomfort.',
      howToUse: '5-10g once or twice daily before meals as recommended by treating doctor.',
      ingredients: 'Punarnava, Dashamoola, Ashwagandha, Shatavari, Eranda, Milk, Cow ghee.',
      shortDescription: 'Nourishes uterine tissue, regularizes cycles, and relieves dysmenorrhea.',
    },
    {
      sku: 'AYUR-TAB-001',
      name: 'Maha Yogaraja Guggulu Classical',
      catCode: 'CAT_GULIKAS',
      mrp: 680.00,
      taxPercent: 12.00,
      prescriptionRequired: true, // Rx Required
      refillDays: 45,
      packSize: '100 Tablets Pack',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Advanced classical mineral-herb compound tablet for severe rheumatoid arthritis, sciatica, ankylosing spondylitis, and chronic gout.',
      howToUse: '1-2 tablets twice daily after meals with warm water or Maharasnadi Kashayam as advised by doctor.',
      ingredients: 'Purified Guggulu, Triphala, Trikatu, Chavya, Pippalimoola, Bhasmas (Rasa preparation).',
      shortDescription: 'Gold-standard classical prescription tablet for severe chronic joint pain.',
    },
    {
      sku: 'AYUR-TAB-002',
      name: 'Kanchnar Guggulu Glandular Care',
      catCode: 'CAT_GULIKAS',
      mrp: 560.00,
      taxPercent: 12.00,
      prescriptionRequired: true, // Rx Required
      refillDays: 45,
      packSize: '100 Tablets Pack',
      status: 'approved',
      stockStatus: 'in_stock',
      usageDescription: 'Classical thyroid and lymphatic detox tablet designed to clear benign swellings, lipomas, and glandular enlargements.',
      howToUse: '2 tablets twice daily with lukewarm water after food.',
      ingredients: 'Bauhinia variegata (Kanchnar bark), Triphala, Trikatu, Varuna, Shuddha Guggulu.',
      shortDescription: 'Prescription support for healthy thyroid function and lymphatic clearance.',
    },
    {
      sku: 'AYUR-TAB-003',
      name: 'Chandraprabha Vati Urinary Tonic',
      catCode: 'CAT_GULIKAS',
      mrp: 420.00,
      taxPercent: 12.00,
      prescriptionRequired: false,
      refillDays: 45,
      packSize: '100 Tablets Pack',
      status: 'approved',
      stockStatus: 'out_of_stock', // OOS for testing waitlists
      usageDescription: 'Comprehensive rejuvenation tablet for urinary tract comfort, prostate health, and restoring general vitality in both men and women.',
      howToUse: '1-2 tablets twice a day with water or milk after meals.',
      ingredients: 'Shilajit, Guggulu, Karpoora, Vacha, Musta, Kiratatikta, Devadaru, Haridra.',
      shortDescription: 'Clears urinary tract discomfort and acts as a mild systemic rejuvenator.',
    },
  ];

  const productsBySku: Record<string, any> = {};
  for (const p of productDefs) {
    const category = categoriesByCode[p.catCode];
    productsBySku[p.sku] = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        categoryId: category.id,
        price: p.mrp,
        prescriptionRequired: p.prescriptionRequired,
        refillDays: p.refillDays,
        packSize: p.packSize,
        status: p.status,
        stockStatus: p.stockStatus,
        usageDescription: p.usageDescription,
        howToUse: p.howToUse,
        ingredients: p.ingredients,
        shortDescription: p.shortDescription,
        approvedById: prodMgr.id,
        approvedAt: new Date(),
      },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: category.id,
        price: p.mrp,
        prescriptionRequired: p.prescriptionRequired,
        refillDays: p.refillDays,
        packSize: p.packSize,
        status: p.status,
        stockStatus: p.stockStatus,
        usageDescription: p.usageDescription,
        howToUse: p.howToUse,
        ingredients: p.ingredients,
        shortDescription: p.shortDescription,
        createdById: prodMgr.id,
        approvedById: prodMgr.id,
        approvedAt: new Date(),
      },
    });
  }
  console.log(`✓ Seeded ${Object.keys(productsBySku).length} Products (approved, with stock and prescription flags)`);

  // 4. Curated Product Relations (15 entries across 4 types)
  const relationDefs = [
    // Cross-sell
    { from: 'AYUR-OIL-001', to: 'AYUR-OIL-002', type: 'cross_sell', point: 'Combine acute trauma oil with deep-tissue Kuzhampu for complete muscle recovery.', sort: 1 },
    { from: 'AYUR-KASH-001', to: 'AYUR-CHUR-001', type: 'cross_sell', point: 'Triphala digestive colon cleanse amplifies immunity decoction bioavailability.', sort: 2 },
    { from: 'AYUR-KASH-002', to: 'AYUR-CHUR-004', type: 'cross_sell', point: 'Trikatu enhances metabolic detox and accelerates deep-tissue fat digestion.', sort: 3 },
    { from: 'AYUR-OIL-005', to: 'AYUR-OIL-006', type: 'cross_sell', point: 'Alternate Neelibringadi with cooling Kayyanyadi for scalp thermal balance.', sort: 4 },
    // Upsell
    { from: 'AYUR-OIL-001', to: 'AYUR-OIL-002', type: 'upsell', point: 'Upgrade to the 450ml Economy pack for sustained rehabilitation at 20% lower cost/ml.', sort: 1 },
    { from: 'AYUR-CHUR-001', to: 'AYUR-CHUR-002', type: 'upsell', point: 'Upgrade to Avipathi Churnam if experiencing frequent acid reflux or heartburn.', sort: 2 },
    { from: 'AYUR-KASH-003', to: 'AYUR-TAB-001', type: 'upsell', point: 'Add concentrated Maha Yogaraja Guggulu tablets for chronic degenerative pain.', sort: 3 },
    // Frequently Together
    { from: 'AYUR-OIL-001', to: 'AYUR-OIL-003', type: 'frequently_together', point: 'The classic dual-oil blend widely used for acute sprain and localized edema.', sort: 1 },
    { from: 'AYUR-KASH-003', to: 'AYUR-TAB-001', type: 'frequently_together', point: 'Doctor-recommended gold standard protocol for knee osteoarthritis.', sort: 2 },
    { from: 'AYUR-GHRI-002', to: 'AYUR-CHUR-003', type: 'frequently_together', point: 'Synergistic evening duo for restorative deep sleep and cognitive revitalization.', sort: 3 },
    { from: 'AYUR-KASH-001', to: 'AYUR-CHUR-004', type: 'frequently_together', point: 'Powerful seasonal cold & flu defense package.', sort: 4 },
    // Substitute
    { from: 'AYUR-OIL-003', to: 'AYUR-OIL-004', type: 'substitute', point: 'Substitute Sahacharadi Thailam if patient has lower back/sciatic pain without heat/swelling.', sort: 1 },
    { from: 'AYUR-OIL-006', to: 'AYUR-OIL-005', type: 'substitute', point: 'Substitute Neelibringadi as daily hair vitalizer while Kayyanyadi is out of stock.', sort: 2 },
    { from: 'AYUR-TAB-003', to: 'AYUR-TAB-002', type: 'substitute', point: 'Alternative glandular and fluid balance tablet while Chandraprabha is restocking.', sort: 3 },
    { from: 'AYUR-CHUR-004', to: 'AYUR-CHUR-002', type: 'substitute', point: 'Gentler digestive option when Pitta burning sensations are prominent.', sort: 4 },
  ];

  // Clean old test relations for clean upsert
  await prisma.productRelation.deleteMany({});
  for (const rel of relationDefs) {
    const fromP = productsBySku[rel.from];
    const toP = productsBySku[rel.to];
    if (fromP && toP) {
      await prisma.productRelation.create({
        data: {
          productId: fromP.id,
          relatedProductId: toP.id,
          relationType: rel.type,
          talkingPoint: rel.point,
          sort: rel.sort,
        },
      });
    }
  }
  console.log(`✓ Seeded ${relationDefs.length} Curated Product Relations (cross_sell, upsell, frequently_together, substitute)`);

  // 5. Product Campaigns (3 campaigns with budgets, spend, and linked products)
  const campaignDefs = [
    {
      campaignKey: 'monsoon-immunity-2026',
      name: 'Monsoon Immunity & Detox Drive 2026',
      channel: 'meta_ads',
      budget: 50000.00,
      spent: 18500.00,
      status: 'active',
      notes: 'Seasonal social media campaign targeting families for prevention of viral fevers and monsoon gut sluggishness.',
      productSkus: ['AYUR-KASH-001', 'AYUR-CHUR-001', 'AYUR-CHUR-004'],
    },
    {
      campaignKey: 'joint-care-google',
      name: 'Kerala Ayurveda Joint Care Campaign',
      channel: 'google_ads',
      budget: 60000.00,
      spent: 24000.00,
      status: 'active',
      notes: 'High-intent search campaign targeting middle-aged and elderly patients with knee pain, sciatica, and morning stiffness.',
      productSkus: ['AYUR-OIL-001', 'AYUR-OIL-002', 'AYUR-KASH-003', 'AYUR-TAB-001'],
    },
    {
      campaignKey: 'ayur-wellness-meta',
      name: 'Daily Herbal Wellness & Vitality Promo',
      channel: 'meta_ads',
      budget: 75000.00,
      spent: 32000.00,
      status: 'active',
      notes: 'General lifestyle and preventive wellness promotion focusing on hair care and natural stress adaptogens.',
      productSkus: ['AYUR-OIL-005', 'AYUR-CHUR-003', 'AYUR-GHRI-002'],
    },
  ];

  const campaignsByKey: Record<string, any> = {};
  for (const c of campaignDefs) {
    const campaign = await prisma.productCampaign.upsert({
      where: { campaignKey: c.campaignKey },
      update: {
        name: c.name,
        channel: c.channel,
        budget: c.budget,
        spent: c.spent,
        status: c.status,
        notes: c.notes,
        ownerId: prodMgr.id,
      },
      create: {
        campaignKey: c.campaignKey,
        name: c.name,
        channel: c.channel,
        budget: c.budget,
        spent: c.spent,
        status: c.status,
        notes: c.notes,
        ownerId: prodMgr.id,
      },
    });
    campaignsByKey[c.campaignKey] = campaign;

    // Link campaign products
    await prisma.campaignProduct.deleteMany({ where: { campaignId: campaign.id } });
    for (let i = 0; i < c.productSkus.length; i++) {
      const prod = productsBySku[c.productSkus[i]];
      if (prod) {
        await prisma.campaignProduct.create({
          data: {
            campaignId: campaign.id,
            productId: prod.id,
            sort: i + 1,
          },
        });
      }
    }
  }
  console.log(`✓ Seeded ${Object.keys(campaignsByKey).length} Product Campaigns with linked products`);

  // 6. Product Leads (25 diverse leads with realistic data, interests, orders, and waitlists)
  const leadSeeds = [
    // 5 New Leads
    { name: 'Siddharth Menon', mobile: '+919800010001', camp: 'joint-care-google', status: 'new', sku: 'AYUR-OIL-001', qty: 2, concern: 'Severe knee pain and stiffness while climbing stairs.' },
    { name: 'Ananya Ramesh', mobile: '+919800010002', camp: 'ayur-wellness-meta', status: 'new', sku: 'AYUR-OIL-005', qty: 1, concern: 'Hair thinning and dry scalp after moving to Kochi.' },
    { name: 'Rohan Pillai', mobile: '+919800010003', camp: 'monsoon-immunity-2026', status: 'new', sku: 'AYUR-KASH-001', qty: 3, concern: 'Recurrent seasonal colds and throat irritation.' },
    { name: 'Divya Nambiar', mobile: '+919800010004', camp: 'joint-care-google', status: 'new', sku: 'AYUR-OIL-003', qty: 1, concern: 'Tennis elbow swelling from badminton practice.' },
    { name: 'Vishnu Das', mobile: '+919800010005', camp: 'ayur-wellness-meta', status: 'new', sku: 'AYUR-CHUR-003', qty: 2, concern: 'Work stress and trouble falling asleep at night.' },

    // 6 Contacted Leads
    { name: 'Pooja Nair', mobile: '+919800010006', camp: 'monsoon-immunity-2026', status: 'contacted', sku: 'AYUR-KASH-001', qty: 2, concern: 'Inquired about dosage for elderly parents.' },
    { name: 'Karthik Varrier', mobile: '+919800010007', camp: 'joint-care-google', status: 'contacted', sku: 'AYUR-OIL-002', qty: 1, concern: 'Chronic lower back stiffness, asked about delivery speed.' },
    { name: 'Maya Sundaram', mobile: '+919800010008', camp: 'ayur-wellness-meta', status: 'contacted', sku: 'AYUR-OIL-005', qty: 2, concern: 'Discussed Neelibringadi and herbal shampoo routine.' },
    { name: 'Nikhil George', mobile: '+919800010009', camp: 'monsoon-immunity-2026', status: 'contacted', sku: 'AYUR-CHUR-001', qty: 1, concern: 'Digestive sluggishness, asked if Triphala causes cramps.' },
    { name: 'Archana Krishnan', mobile: '+919800010010', camp: 'joint-care-google', status: 'contacted', sku: 'AYUR-OIL-004', qty: 1, concern: 'Sciatica nerve tingling radiating down left leg.' },
    { name: 'Gautam Varma', mobile: '+919800010011', camp: 'ayur-wellness-meta', status: 'contacted', sku: 'AYUR-GHRI-002', qty: 1, concern: 'Needs prescription guidance for Brahmi Ghritham for board exam student.' },

    // 5 Interested Leads
    { name: 'Sunil Kurup', mobile: '+919800010012', camp: 'joint-care-google', status: 'interested', sku: 'AYUR-TAB-001', qty: 2, concern: 'Consulting treating physician for prescription confirmation on Guggulu.' },
    { name: 'Deepa Warrier', mobile: '+919800010013', camp: 'monsoon-immunity-2026', status: 'interested', sku: 'AYUR-KASH-002', qty: 2, concern: 'Wants to bundle Varanadi Kashayam with Triphala powder.' },
    { name: 'Arun Balakrishnan', mobile: '+919800010014', camp: 'ayur-wellness-meta', status: 'interested', sku: 'AYUR-CHUR-003', qty: 2, concern: 'Requested payment link via WhatsApp.' },
    { name: 'Meenakshi Iyer', mobile: '+919800010015', camp: 'joint-care-google', status: 'interested', sku: 'AYUR-OIL-002', qty: 2, concern: 'Ready to order 2 bottles of Dhanwantharam Kuzhampu on payday.' },
    { name: 'Biju Joseph', mobile: '+919800010016', camp: 'monsoon-immunity-2026', status: 'interested', sku: 'AYUR-KASH-001', qty: 4, concern: 'Bulk family pack for monsoon season.' },

    // 5 Converted Leads (with saleConfirmedAt, orderReference, and refill tasks)
    { name: 'Rajesh Sharma', mobile: '+919800010017', camp: 'joint-care-google', status: 'converted', sku: 'AYUR-OIL-002', qty: 2, orderRef: 'ORD-2026-001', saleAmount: 1080.00, concern: 'Confirmed order for knee therapy package.' },
    { name: 'Lakshmi Venkat', mobile: '+919800010018', camp: 'ayur-wellness-meta', status: 'converted', sku: 'AYUR-OIL-005', qty: 1, orderRef: 'ORD-2026-002', saleAmount: 410.00, concern: 'Confirmed Neelibringadi bottle.' },
    { name: 'Manoj Kumar', mobile: '+919800010019', camp: 'joint-care-google', status: 'converted', sku: 'AYUR-TAB-001', qty: 2, orderRef: 'ORD-2026-003', saleAmount: 1360.00, concern: 'Doctor prescription verified for Maha Yogaraja Guggulu.' },
    { name: 'Sneha Roy', mobile: '+919800010020', camp: 'monsoon-immunity-2026', status: 'converted', sku: 'AYUR-KASH-001', qty: 2, orderRef: 'ORD-2026-004', saleAmount: 440.00, concern: 'Confirmed immunity decoction bottles.' },
    { name: 'Pradeep Chandran', mobile: '+919800010021', camp: 'ayur-wellness-meta', status: 'converted', sku: 'AYUR-GHRI-002', qty: 1, orderRef: 'ORD-2026-005', saleAmount: 520.00, concern: 'Prescription verified for Brahmi Ghritham neuro-tonic.' },

    // 4 Closed / Lost Leads
    { name: 'Haridas K', mobile: '+919800010022', camp: 'joint-care-google', status: 'closed', sku: 'AYUR-TAB-001', qty: 1, concern: 'Found the pricing higher than local Ayurvedic pharmacy.' },
    { name: 'Suma Prabhakar', mobile: '+919800010023', camp: 'monsoon-immunity-2026', status: 'closed', sku: 'AYUR-KASH-004', qty: 1, concern: 'Decided to consult homeopath instead.' },
    { name: 'Vivek V', mobile: '+919800010024', camp: 'ayur-wellness-meta', status: 'closed', sku: 'AYUR-OIL-005', qty: 1, concern: 'Traveling out of state for 3 months.' },
    { name: 'Geetha Raman', mobile: '+919800010025', camp: 'joint-care-google', status: 'closed', sku: 'AYUR-OIL-001', qty: 1, concern: 'Wants only doctor consultation at hospital, not product.' },
  ];

  for (const ls of leadSeeds) {
    const campaign = campaignsByKey[ls.camp];
    const product = productsBySku[ls.sku];

    // Upsert Lead
    const lead = await prisma.lead.upsert({
      where: {
        id: (await prisma.lead.findFirst({ where: { mobile: ls.mobile } }))?.id || 0,
      },
      update: {
        name: ls.name,
        mobile: ls.mobile,
        mobileNorm: ls.mobile.replace('+', ''),
        leadType: 'product',
        campaignId: campaign?.id,
        status: ls.status,
        concern: ls.concern,
        ownerId: prodCaller.id,
        branchId: mainBranch.id,
        departmentId: ayurDept.id,
        sourceId: metaSource.id,
        saleConfirmedAt: ls.status === 'converted' ? new Date() : null,
        saleAmount: (ls as any).saleAmount ? (ls as any).saleAmount : null,
        orderReference: (ls as any).orderRef ? (ls as any).orderRef : null,
        closedReasonId: ls.status === 'closed' ? lostReasonPrice?.id : null,
      },
      create: {
        name: ls.name,
        mobile: ls.mobile,
        mobileNorm: ls.mobile.replace('+', ''),
        leadType: 'product',
        campaignId: campaign?.id,
        status: ls.status,
        concern: ls.concern,
        ownerId: prodCaller.id,
        branchId: mainBranch.id,
        departmentId: ayurDept.id,
        sourceId: metaSource.id,
        saleConfirmedAt: ls.status === 'converted' ? new Date() : null,
        saleAmount: (ls as any).saleAmount ? (ls as any).saleAmount : null,
        orderReference: (ls as any).orderRef ? (ls as any).orderRef : null,
        closedReasonId: ls.status === 'closed' ? lostReasonPrice?.id : null,
      },
    });

    // Attach product interest
    if (product) {
      await prisma.leadProductInterest.deleteMany({ where: { leadId: lead.id } });
      await prisma.leadProductInterest.create({
        data: {
          leadId: lead.id,
          productId: product.id,
          quantity: ls.qty,
          unitPriceAtTime: product.price,
          status: ls.status === 'converted' ? 'accepted' : (ls.status === 'closed' ? 'declined' : 'interested'),
          origin: 'campaign',
          prescriptionVerified: product.prescriptionRequired && ls.status === 'converted',
          addedById: prodCaller.id,
        },
      });

      // If converted and refill days exist, schedule refill reminder task
      if (ls.status === 'converted' && product.refillDays) {
        const reminderDue = new Date();
        reminderDue.setDate(reminderDue.getDate() + Math.max(product.refillDays - 5, 1));

        await prisma.task.deleteMany({ where: { leadId: lead.id, type: 'refill_reminder' } });
        await prisma.task.create({
          data: {
            title: `Refill Reminder: ${product.name} (order #${(ls as any).orderRef})`,
            type: 'refill_reminder',
            dueAt: reminderDue,
            priority: 'warm',
            status: 'open',
            ownerId: prodCaller.id,
            leadId: lead.id,
          },
        });
      }
    }
  }
  console.log(`✓ Seeded ${leadSeeds.length} Product Leads (new, contacted, interested, converted, closed) with interests and refill reminders`);

  // 7. Seed 2 Waitlist entries on Out-of-Stock items
  const waitlistLead1 = await prisma.lead.findFirst({ where: { mobile: '+919800010002' } });
  const oosProduct1 = productsBySku['AYUR-OIL-006']; // Kayyanyadi Thailam OOS
  if (waitlistLead1 && oosProduct1) {
    await prisma.productWaitlist.upsert({
      where: {
        leadId_productId: {
          leadId: waitlistLead1.id,
          productId: oosProduct1.id,
        },
      },
      update: { notifiedAt: null },
      create: {
        leadId: waitlistLead1.id,
        productId: oosProduct1.id,
      },
    });
  }

  const waitlistLead2 = await prisma.lead.findFirst({ where: { mobile: '+919800010005' } });
  const oosProduct2 = productsBySku['AYUR-TAB-003']; // Chandraprabha Vati OOS
  if (waitlistLead2 && oosProduct2) {
    await prisma.productWaitlist.upsert({
      where: {
        leadId_productId: {
          leadId: waitlistLead2.id,
          productId: oosProduct2.id,
        },
      },
      update: { notifiedAt: null },
      create: {
        leadId: waitlistLead2.id,
        productId: oosProduct2.id,
      },
    });
  }
  console.log('✓ Seeded 2 Out-of-Stock Product Waitlist entries');

  console.log('--- Product Module Seed Complete ---');
}

// Direct execution
if (process.argv[1]?.includes('seed-products')) {
  seedProductModule()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
