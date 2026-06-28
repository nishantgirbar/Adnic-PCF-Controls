export interface ICensusMember {
    rowNumber: number;
    serialNumber?: string;
    pfNo: string;
    memberNo?: string;
    memberName: string;
    relationship?: string;
    dependency?: string;
    gender?: string;
    maritalStatus?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportNo?: string;
    passportExpiryDate?: string;
    emiratesId?: string;
    emiratesIdExpiryDate?: string;
    visaType?: string;
    visaApplicationNo?: string;
    entryPermitNo?: string;
    visaLocation?: string;
    visaEmirate?: string;
    classNo?: string;
    memberCategory?: string;
    medicalDeclaration?: string;
    effectiveDate?: string;
    premiumCoverageEntryDate?: string;
    changeOfStatusDate?: string;
    mobileNo?: string;
    emailId?: string;
    thiqaCardNo?: string;
    position?: string;
    workLocation?: string;
    residenceLocation?: string;
    salaryBand?: string;
    commission?: string;
    sponsorType?: string;
    sponsorId?: string;
    sponsorCountry?: string;
    birthCertificateId?: string;
    validationStatus?: string;
    validationRemarks?: string;
    recordStatus?: string;
}

export interface IMismatchedMember {
    member: ICensusMember;
    matchStatus: string;
    matchReasons: string[];
}