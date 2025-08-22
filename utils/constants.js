// FHIR Server Constants
const FHIR_SERVER = {
  BASE_URL: 'https://qa-mis.apeiro-digital.com/fhir',
  TERMINOLOGY_URL: 'http://terminology.hl7.org',
  PROVIDER_URL: 'https://api-edi.provider.sha.go.ke',
  PATHS: {
    PATIENT: 'Patient',
    ORGANIZATION: 'Organization',
    CLAIM: 'Claim',
    COVERAGE: 'Coverage'
  },
  VALUE_STRINGS: {
    SHA: 'SOCIAL HEALTH AUTHORITY',
    COVERAGE: 'sha-coverage',
    CAT_SHA: 'CAT-SHA-001'
  }
};

// FHIR Resource Constants
const FHIR_RESOURCES = {
  IDENTIFIER_SYSTEMS: {
    SHA: `${FHIR_SERVER.BASE_URL}/identifier/shanumber`,
    NATIONAL_ID: `${FHIR_SERVER.BASE_URL}/identifier/nationalid`,
    PROVIDER_LICENSE: `${FHIR_SERVER.BASE_URL}/license/provider-license`,
    SLADE_CODE: `${FHIR_SERVER.BASE_URL}/identifier/sladecode`,
    STRUCTURED_DEFINATION: `${FHIR_SERVER.BASE_URL}/StructureDefinition/bundle|1.0.0`,
    PATIENT: `${FHIR_SERVER.BASE_URL}/Patient`,
  },
  CODE_SYSTEMS: {
    INTERVENTION: `${FHIR_SERVER.BASE_URL}/CodeSystem/intervention-codes`,
    FACILITY_LEVEL: `${FHIR_SERVER.BASE_URL}/StructureDefinition/facility-level`,
    ATTACHMENT_TYPE: `${FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`
  },
  EXTENSIONS: {
    FACILITY_LEVEL: `${FHIR_SERVER.BASE_URL}/StructureDefinition/facility-level`,
    PATIENT_INVOICE: `${FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patientInvoice`
  },
};

module.exports = {
  FHIR_SERVER,
  FHIR_RESOURCES
};