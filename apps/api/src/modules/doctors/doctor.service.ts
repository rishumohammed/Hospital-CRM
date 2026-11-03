import { prisma } from '../../database/client';
import { CreateDoctorInput, UpdateDoctorInput } from '@hospital-crm/shared';
import { logAudit } from '../audit/audit.service';
import { FastifyRequest } from 'fastify';

export interface DepartmentDoctor {
  id: number;
  name: string;
  departmentId: number;
  departmentName?: string;
  departmentCode?: string;
  qualification: string;
  designation: string;
  opdTiming: string;
  roomNo: string;
  consultationFee: number;
  phone: string;
  email: string;
  active: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

const SETTING_KEY = 'department_doctors';

const defaultDoctorTemplates = [
  {
    name: 'Dr. Suresh Kumar',
    deptCode: 'TRADITIONAL_AYURVEDA',
    qualification: 'BAMS, MD (Ayurveda)',
    designation: 'Chief Ayurvedic Physician',
    opdTiming: '09:00 AM - 01:00 PM (Mon-Sat)',
    roomNo: 'Room 101',
    consultationFee: 500,
    phone: '+919847000101',
    email: 'suresh.kumar@hospitalcrm.com',
  },
  {
    name: 'Dr. Harish Chandran',
    deptCode: 'MARMA_BONE_ALIGNMENT',
    qualification: 'BAMS, Certified Marma Specialist',
    designation: 'Senior Marma & Spine Specialist',
    opdTiming: '10:00 AM - 02:00 PM (Mon-Sat)',
    roomNo: 'Room 102',
    consultationFee: 600,
    phone: '+919847000102',
    email: 'harish.c@hospitalcrm.com',
  },
  {
    name: 'Dr. Anjali Nair',
    deptCode: 'PANCHA_KARMA_SPA',
    qualification: 'BAMS, PG Diploma in Panchakarma',
    designation: 'Senior Panchakarma Consultant',
    opdTiming: '09:30 AM - 01:30 PM (Mon-Sat)',
    roomNo: 'Room 104',
    consultationFee: 500,
    phone: '+919847000103',
    email: 'anjali.nair@hospitalcrm.com',
  },
  {
    name: 'Dr. Mohammed Shafi',
    deptCode: 'HIJAMA_ACUPUNCTURE',
    qualification: 'BAMS, Certified Hijama Practitioner',
    designation: 'Hijama & Cupping Therapy Consultant',
    opdTiming: '02:00 PM - 06:00 PM (Mon-Sat)',
    roomNo: 'Room 105',
    consultationFee: 450,
    phone: '+919847000104',
    email: 'm.shafi@hospitalcrm.com',
  },
  {
    name: 'Dr. Sarah Joseph',
    deptCode: 'POST_NATAL_CARE',
    qualification: 'BAMS, DGO (Ayur)',
    designation: 'Consultant - Mother & Baby Rehabilitation',
    opdTiming: '10:00 AM - 02:00 PM (Mon-Sat)',
    roomNo: 'Room 106',
    consultationFee: 550,
    phone: '+919847000105',
    email: 'sarah.joseph@hospitalcrm.com',
  },
  {
    name: 'Dr. Manoj Varma',
    deptCode: 'INFERTILITY_COSMETIC',
    qualification: 'BAMS, MD (Prasuti Tantra)',
    designation: 'Fertility & Reproductive Health Specialist',
    opdTiming: '09:00 AM - 01:00 PM (Mon-Sat)',
    roomNo: 'Room 107',
    consultationFee: 650,
    phone: '+919847000106',
    email: 'manoj.varma@hospitalcrm.com',
  },
  {
    name: 'Dr. Rajesh K',
    deptCode: 'DIABETIC_VARICOSE',
    qualification: 'BAMS, MS (Shalya Tantra)',
    designation: 'Vascular & Leech Therapy Specialist',
    opdTiming: '11:00 AM - 03:00 PM (Mon-Sat)',
    roomNo: 'Room 108',
    consultationFee: 500,
    phone: '+919847000107',
    email: 'rajesh.k@hospitalcrm.com',
  },
  {
    name: 'Dr. Priya S',
    deptCode: 'PHYSIOTHERAPY_NATUROPATHY',
    qualification: 'BPT, MPT (Neuro/Ortho Rehab)',
    designation: 'Chief Physiotherapist',
    opdTiming: '09:00 AM - 05:00 PM (Mon-Sat)',
    roomNo: 'Physio Wing',
    consultationFee: 400,
    phone: '+919847000108',
    email: 'priya.s@hospitalcrm.com',
  },
  {
    name: 'Dr. Abdul Rasheed',
    deptCode: 'DE_ADDICTION_REFLEXOLOGY',
    qualification: 'BAMS, Dip. Clinical Counseling',
    designation: 'De-addiction & Wellness Counselor',
    opdTiming: '02:00 PM - 06:00 PM (Mon-Sat)',
    roomNo: 'Room 109',
    consultationFee: 500,
    phone: '+919847000109',
    email: 'rasheed.a@hospitalcrm.com',
  },
  {
    name: 'Dr. Radhika Menon',
    deptCode: 'INTEGRATED_MEDICINE',
    qualification: 'MBBS, BAMS',
    designation: 'Integrative Medicine Specialist',
    opdTiming: '10:00 AM - 03:00 PM (Mon-Sat)',
    roomNo: 'Room 110',
    consultationFee: 700,
    phone: '+919847000110',
    email: 'radhika.menon@hospitalcrm.com',
  },
  {
    name: 'Dr. Vivek Sharma',
    deptCode: 'YOGA_WELLNESS',
    qualification: 'BNYS (Naturopathy & Yogic Sciences)',
    designation: 'Wellness & Lifestyle Physician',
    opdTiming: '07:00 AM - 12:00 PM (Mon-Sat)',
    roomNo: 'Wellness Center',
    consultationFee: 350,
    phone: '+919847000111',
    email: 'vivek.s@hospitalcrm.com',
  },
  {
    name: 'Dr. Usman Farooq',
    deptCode: 'CIRCUMCISION',
    qualification: 'MBBS, MS (General Surgery)',
    designation: 'Surgical Specialist',
    opdTiming: '03:00 PM - 07:00 PM (Tue, Thu, Sat)',
    roomNo: 'Minor OT Wing',
    consultationFee: 600,
    phone: '+919847000112',
    email: 'usman.f@hospitalcrm.com',
  },
];

async function getStoredDoctors(): Promise<DepartmentDoctor[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
  });

  if (setting && Array.isArray(setting.value)) {
    return (setting.value as unknown) as DepartmentDoctor[];
  }

  // Initialize with default doctors mapped against existing database departments
  const departments = await prisma.department.findMany();
  const deptMapByCode = new Map(departments.map((d) => [d.code.toUpperCase(), d]));

  const initialList: DepartmentDoctor[] = [];
  const now = new Date().toISOString();

  defaultDoctorTemplates.forEach((tmpl, idx) => {
    const dept = deptMapByCode.get(tmpl.deptCode.toUpperCase()) || departments[0];
    if (dept) {
      initialList.push({
        id: idx + 1,
        name: tmpl.name,
        departmentId: dept.id,
        qualification: tmpl.qualification,
        designation: tmpl.designation,
        opdTiming: tmpl.opdTiming,
        roomNo: tmpl.roomNo,
        consultationFee: tmpl.consultationFee,
        phone: tmpl.phone,
        email: tmpl.email,
        active: true,
        sort: idx + 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: initialList as any },
    update: { value: initialList as any },
  });

  return initialList;
}

async function saveDoctors(doctors: DepartmentDoctor[]) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: doctors as any },
    update: { value: doctors as any },
  });
}

export async function listDoctors(params?: {
  departmentId?: number;
  activeOnly?: boolean;
  search?: string;
}): Promise<DepartmentDoctor[]> {
  const [allDoctors, departments] = await Promise.all([
    getStoredDoctors(),
    prisma.department.findMany(),
  ]);

  const deptMapById = new Map(departments.map((d) => [d.id, d]));

  let results = allDoctors.map((doc) => {
    const dept = deptMapById.get(doc.departmentId);
    return {
      ...doc,
      departmentName: dept?.labelEn || 'General Department',
      departmentCode: dept?.code || '',
    };
  });

  if (params?.activeOnly) {
    results = results.filter((d) => d.active);
  }

  if (params?.departmentId) {
    const targetDeptId = Number(params.departmentId);
    results = results.filter((d) => Number(d.departmentId) === targetDeptId);
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    results = results.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.qualification.toLowerCase().includes(q) ||
        (d.designation && d.designation.toLowerCase().includes(q)) ||
        (d.departmentName && d.departmentName.toLowerCase().includes(q)) ||
        (d.roomNo && d.roomNo.toLowerCase().includes(q))
    );
  }

  // Sort by department label, then by doctor sort/name
  return results.sort((a, b) => {
    if ((a.departmentName || '') !== (b.departmentName || '')) {
      return (a.departmentName || '').localeCompare(b.departmentName || '');
    }
    return (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name);
  });
}

export async function getDoctorById(id: number): Promise<DepartmentDoctor | null> {
  const doctors = await listDoctors({ activeOnly: false });
  return doctors.find((d) => d.id === id) || null;
}

export async function createDoctor(
  input: CreateDoctorInput,
  user: any,
  req?: FastifyRequest
): Promise<DepartmentDoctor> {
  const doctors = await getStoredDoctors();
  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
  });

  if (!department) {
    throw new Error(`Department with ID ${input.departmentId} not found`);
  }

  const maxId = doctors.reduce((max, d) => Math.max(max, d.id || 0), 0);
  const nextId = maxId + 1;
  const now = new Date().toISOString();

  const newDoctor: DepartmentDoctor = {
    id: nextId,
    name: input.name.trim(),
    departmentId: input.departmentId,
    qualification: input.qualification.trim(),
    designation: input.designation?.trim() || 'Consultant',
    opdTiming: input.opdTiming?.trim() || '09:00 AM - 01:00 PM',
    roomNo: input.roomNo?.trim() || '',
    consultationFee: input.consultationFee ?? 0,
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    active: input.active ?? true,
    sort: input.sort ?? (doctors.length + 1),
    createdAt: now,
    updatedAt: now,
  };

  doctors.push(newDoctor);
  await saveDoctors(doctors);

  if (user) {
    await logAudit(prisma, {
      userId: user.id,
      action: 'DOCTOR_CREATED',
      entity: 'doctor',
      entityId: newDoctor.id,
      after: newDoctor,
      req,
    });
  }

  return {
    ...newDoctor,
    departmentName: department.labelEn,
    departmentCode: department.code,
  };
}

export async function updateDoctor(
  id: number,
  input: UpdateDoctorInput,
  user: any,
  req?: FastifyRequest
): Promise<DepartmentDoctor> {
  const doctors = await getStoredDoctors();
  const index = doctors.findIndex((d) => d.id === id);

  if (index === -1) {
    throw new Error(`Doctor with ID ${id} not found`);
  }

  const before = { ...doctors[index] };

  if (input.departmentId !== undefined) {
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!dept) {
      throw new Error(`Department with ID ${input.departmentId} not found`);
    }
  }

  const updatedDoctor: DepartmentDoctor = {
    ...before,
    name: input.name !== undefined ? input.name.trim() : before.name,
    departmentId: input.departmentId !== undefined ? input.departmentId : before.departmentId,
    qualification: input.qualification !== undefined ? input.qualification.trim() : before.qualification,
    designation: input.designation !== undefined ? input.designation.trim() : before.designation,
    opdTiming: input.opdTiming !== undefined ? input.opdTiming.trim() : before.opdTiming,
    roomNo: input.roomNo !== undefined ? input.roomNo.trim() : before.roomNo,
    consultationFee: input.consultationFee !== undefined ? input.consultationFee : before.consultationFee,
    phone: input.phone !== undefined ? input.phone.trim() : before.phone,
    email: input.email !== undefined ? input.email.trim() : before.email,
    active: input.active !== undefined ? input.active : before.active,
    sort: input.sort !== undefined ? input.sort : before.sort,
    updatedAt: new Date().toISOString(),
  };

  doctors[index] = updatedDoctor;
  await saveDoctors(doctors);

  if (user) {
    await logAudit(prisma, {
      userId: user.id,
      action: 'DOCTOR_UPDATED',
      entity: 'doctor',
      entityId: id,
      before,
      after: updatedDoctor,
      req,
    });
  }

  const department = await prisma.department.findUnique({
    where: { id: updatedDoctor.departmentId },
  });

  return {
    ...updatedDoctor,
    departmentName: department?.labelEn || 'General Department',
    departmentCode: department?.code || '',
  };
}

export async function deleteDoctor(
  id: number,
  user: any,
  req?: FastifyRequest
): Promise<void> {
  const doctors = await getStoredDoctors();
  const index = doctors.findIndex((d) => d.id === id);

  if (index === -1) {
    throw new Error(`Doctor with ID ${id} not found`);
  }

  const removed = doctors.splice(index, 1)[0];
  await saveDoctors(doctors);

  if (user) {
    await logAudit(prisma, {
      userId: user.id,
      action: 'DOCTOR_DELETED',
      entity: 'doctor',
      entityId: id,
      before: removed,
      req,
    });
  }
}
