/**
 * Helper to determine the natural landing route for each user role in the CRM.
 */
export function getRoleHomeRoute(user: any): string {
  if (!user) return '/';
  const roleCode = (
    user.role?.code ||
    user.roleCode ||
    (typeof user.role === 'string' ? user.role : '')
  ).toLowerCase();

  switch (roleCode) {
    case 'doctor':
      return '/doctor';
    case 'admission_specialist':
    case 'ipd_manager':
      return '/admission';
    case 'aftercare_executive':
    case 'treatment_followup_executive':
      return '/aftercare';
    case 'product_sales_executive':
    case 'product_caller':
      return '/products';
    case 'front_office':
      return '/admission';
    case 'support_telecaller':
    case 'caller':
    case 'owner':
    case 'admin':
    case 'super_admin':
    case 'center_head':
    case 'telecaller_manager':
    case 'auditor':
    default:
      return '/';
  }
}
