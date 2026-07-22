export interface Member {
  rowNumber: number;
  relation: string;
  gender: string;
  dateOfBirth: string;
  salaryType: string;
  visaLocation: string;
  maritalStatus: string;
  requiresMedicalUnderwriting: boolean;
  srNo: number;
  pfNo: string;
  memberNo: string;
  memberName: string;
  dependency: string;
  effectiveDate: string;
  previousCoverageDate: string;
  changeOfStatusDate: string;
  emiratesId: string;
  eidApplicationNo: string;
  entryPermitNo: string;
  visaType: string;
  visaEmirate: string;
  classNo: string;
  nationality: string;
  passportNo: string;
  uidNo: string;
  mobileNo: string;
  emailId: string;
  thiqaCardNo: string;
  position: string;
  workLocation: string;
  residenceLocation: string;
  memberCategory: string;
  salaryBand: string;
  commission: string;
  birthCertificateId: string;
  sponsorType: string;
  sponsorId: string;
  country: string;
  height: string;
  weight: string;
  documentStatus: string;
  entrantType: string;
  entryDate: string;
  recordStatus: string;
  validationErrors: string[];
}

export interface MatchedMember {
  member: Member;
  matchStatus: string;
  matchReasons: string[];
}

export  interface MismatchedMember {
  member: Member;
  matchStatus: string;
  matchReasons: string[];
}

export interface Summary {
  // add fields based on your Summary class
}

export interface UploadValidationResponse {
  members: Member[];
  matchedMembers: MatchedMember[];
  mismatchedMembers: MismatchedMember[];
  errors: string[];
  warnings: string[];
  summary: Summary;
  totalRows: number;
  valid: boolean;
}