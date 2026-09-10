export const ROLES = [
  {
    key: 'Investigator',
    label: 'Investigator',
    canUpload: true,
    canRunSelfTest: false,
    canCreateCase: true,
    canLogEvidence: true,
  },
  {
    key: 'Prosecutor',
    label: 'Prosecutor',
    canUpload: false,
    canRunSelfTest: false,
    canCreateCase: false,
    canLogEvidence: false,
  },
  {
    key: 'Court Clerk',
    label: 'Court Clerk',
    canUpload: false,
    canRunSelfTest: false,
    canCreateCase: false,
    canLogEvidence: false,
  },
  {
    key: 'Admin',
    label: 'Admin',
    canUpload: true,
    canRunSelfTest: true,
    canCreateCase: true,
    canLogEvidence: true,
  },
];

export const DOC_TYPES = [
  'FIR',
  'Witness Statement',
  'Forensic Report',
  'Charge Sheet',
  'Evidence Log',
  'Court Filing',
  'Other',
];

export const EVIDENCE_TYPES = [
  'Digital Storage Device',
  'Forensic Sample',
  'Physical Object',
  'Recording / Footage',
  'Document Bundle',
  'Weapon',
  'Other',
];

export const EVIDENCE_STATUSES = [
  'Collected',
  'In Custody',
  'In Lab',
  'In Use',
  'In Court',
  'Released',
  'Destroyed',
];

export const CASE_STATUSES = [
  'Under Investigation',
  'Charge Sheet Filed',
  'In Court',
  'Closed',
];
