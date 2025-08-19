const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const {
  FHIR_SERVER,
  FHIR_RESOURCES,
  CLAIM_CONSTANTS
} = require('../utils/constants');

class FhirClaimBundleService {

  _getClaimUseType(formData, preAuthResponseId) {
    if (formData.use === 'preauthorization' && !preAuthResponseId) {
      return 'preauthorization';
    }
    if (preAuthResponseId || formData.use === 'claim' || formData.use === "related") {
      return 'claim';
    }
    return undefined;
  }

  transformFormToFhirBundle(formData, preAuthResponseId = null) {
    console.log("preauth id", preAuthResponseId);
    
    // Create the base payload
    const transformedPayload = {
      meta: {
        profile: [
          `${FHIR_RESOURCES.STRUCTURED_DEFINATION}/bundle|1.0.0`,
        ]
      },
      timestamp: new Date().toISOString(),
      type: "message",
      entry: [],
      resourceType: "Bundle",
      id: uuidv4()
    };
    // Add entries for Coverage, Organization, Patient, and Claim
    transformedPayload.entry.push(this._createCoverageEntry(formData.patient));
    transformedPayload.entry.push(this._createOrganizationEntry(formData.provider));
    transformedPayload.entry.push(this._createPatientEntry(formData.patient));
    transformedPayload.entry.push(this._createClaimEntry(formData, preAuthResponseId));
    const payload = JSON.parse(JSON.stringify(transformedPayload));
    console.info('Transformed FHIR Bundle:', JSON.stringify(payload, null, 2));
    

    return payload;
  }

  _createCoverageEntry(patientData) {
    return {
      fullUrl: `${FHIR_SERVER.BASE_URL}/Coverage/${patientData.id}-${FHIR_SERVER.VALUE_STRINGS.COVERAGE}`,
      resource: {
        id: `${patientData.id}-${FHIR_SERVER.VALUE_STRINGS.COVERAGE}`,
        extension: [
          {
            url: `${FHIR_RESOURCES.STRUCTURED_DEFINATION}/schemeCategoryCode`,
            valueString: "CAT-SHA-001"
          },
          {
            url: `${FHIR_RESOURCES.STRUCTURED_DEFINATION}/schemeCategoryName`,
            valueString: `${FHIR_SERVER.VALUE_STRINGS.SHA}`
          }
        ],
        identifier: [
          {
            use: 'official',
            value: `${patientData.id}-sha-coverage`
          }
        ],
        status: "active",
        beneficiary: {
          reference: `https://qa-mis.apeiro-digital.com/fhir/Patient/${patientData.id}`,
          type: "Patient"
        },
        resourceType: "Coverage"
      }
    };
  }

  _createOrganizationEntry(providerData) {
    return {
      fullUrl: `https://qa-mis.apeiro-digital.com/fhir/Organization/${providerData.id}`,
      resource: {
        identifier: [
          {
            use: 'official',
            system: 'https://qa-mis.apeiro-digital.com/fhir/license/provider-license',
            value: "PR-FHIR"
          }
        ],
        active: true,
        type: [
          {
            coding: [
              {
                system: "https://qa-mis.apeiro-digital.com/fhir/terminology/CodeSystem/organization-type",
                code: "prov",
              }
            ]
          }
        ],
        resourceType: "Organization",
        id: providerData.id,
        meta: {
          profile: [
            "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/provider-organization|1.0.0"
          ]
        },
        name: providerData.name,
        extension: [
          {
            url: "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/facility-level",
            valueCodeableConcept: {
              coding: [
                {
                  system: "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/facility-level",
                  code: providerData.level,
                  display: providerData.level
                }
              ]
            }
          }
        ]
      }
    };
  }

  _createPatientEntry(patientData) {
    return {
      fullUrl: `https://qa-mis.apeiro-digital.com/fhir/Patient/${patientData.id}`,
      resource: {
        gender: patientData.gender,
        birthDate: patientData.birthDate,
        resourceType: "Patient",
        id: patientData.id,
        meta: {
          profile: [
            "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/patient|1.0.0"
          ]
        },
        identifier: [
          {
            use: 'official',
            system: 'https://qa-mis.apeiro-digital.com/fhir/identifier/shanumber',
            value: patientData.id
          },
          {
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value,
            use: 'official',
            system: 'https://qa-mis.apeiro-digital.com/fhir/identifier/phonenumber'
          },
          {
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value,
            use: 'official',
            system: 'https://qa-mis.apeiro-digital.com/fhir/identifier/nationalid'
          },
          {
            use: 'official',
            system: 'https://qa-mis.apeiro-digital.com/fhir/identifier/other',
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value
          }
        ],
        name: [
          {
            text: patientData.name,
            family: patientData.name.split(' ').pop(),
            given: [...patientData.name.split(' ').slice(0, -1)]
          }
        ]
      }
    };
  }

  _createClaimEntry(formData, preAuthResponseId) {
    return {
      fullUrl: `https://qa-mis.apeiro-digital.com/fhir/Claim/${uuidv4()}`,
      resource: {
        created: formData.billablePeriod.created,
        provider: {
          reference: `https://qa-mis.apeiro-digital.com/fhir/Organization/${formData.provider.id}`
        },
        supportingInfo: [
          {
            sequence: 1,
            category: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
                  code: "attachment",
                  display: "Attachment"
                }
              ]
            },
            valueAttachment: {
              language: "en",
              url: "https://api-edi.provider.sha.go.ke/media/edi/default.pdf",
              size: "15765",
              title: "Claim Attachment.pdf",
              contentType: "application/pdf",
              extension: [
                {
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "https://qa-mis.apeiro-digital.com/fhir/CodeSystem/attachment-type",
                        code: "discharge-summary",
                        display: "Discharge Summary"
                      }
                    ]
                  },
                  url: "https://qa-mis.apeiro-digital.com/fhir/CodeSystem/attachment-type"
                }
              ]
            }
          },
          {
            sequence: 2,
            category: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
                  code: "attachment",
                  display: "Attachment"
                }
              ]
            },
            valueAttachment: {
              url: "https://api-edi.provider.sha.go.ke/media/edi/default.pdf",
              size: "15765",
              title: "Lab Results.pdf",
              contentType: "application/pdf",
              language: "en",
              extension: [
                {
                  url: "https://qa-mis.apeiro-digital.com/fhir/CodeSystem/attachment-type",
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: "https://qa-mis.apeiro-digital.com/fhir/CodeSystem/attachment-type",
                        code: "other",
                        display: "Other"
                      }
                    ]
                  }
                }
              ]
            }
          }
        ],
        id: uuidv4(),
        status: "active",
        priority: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/processpriority",
              code: "normal"
            }
          ]
        },
        total: {
          value: Number(formData.total.value),
          currency: "KES"
        },
        resourceType: "Claim",
        subType: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/ex-claimsubtype",
              code: formData.claimSubType
            }
          ]
        },
        patient: {
          reference: `https://qa-mis.apeiro-digital.com/fhir/Patient/${formData.patient.id}`
        },
        billablePeriod: {
          start: `${formData.billablePeriod.billableStart}T10:40:22+03:00`,
          end: `${formData.billablePeriod.billableEnd}T12:00:47+03:00`
        },
        diagnosis: [
          {
            sequence: 1,
            diagnosisCodeableConcept: {
              coding: [
                {
                  system: "https://qa-mis.apeiro-digital.com/fhir/terminology/CodeSystem/icd-10",
                  code: "BC00",
                  display: "Multiple valve disease"
                }
              ]
            }
          }
        ],
        related: preAuthResponseId ? this._createRelatedPreAuthEntry(formData.relatedClaimId) : [],
        extension: [
          {
            extension: [
              {
                url: "invoiceNumber",
                valueString: "FUKVC34"
              },
              {
                valueDate: formData.billablePeriod.created,
                url: "invoiceDate"
              },
              {
                url: "invoiceAmount",
                valueMoney: {
                  value: Number(formData.total.value),
                  currency: "KES"
                }
              },
              {
                url: "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/extension-patient-share",
                valueMoney: {
                  value: Number(formData.total?.value),
                  currency: "KES"
                }
              },
              {
                url: "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/extension-patientInvoiceIdentifier",
                valueIdentifier: {
                  system: "https://qa-mis.apeiro-digital.com/fhir/identifier/patientInvoice",
                  value: `${formData.patient.id}-invoice-${uuidv4()}`
                }
              }
            ],
            url: "https://qa-mis.apeiro-digital.com/fhir/StructureDefinition/extension-patientInvoice"
          }
        ],
        identifier: [
          {
            system: 'https://qa-mis.apeiro-digital.com/fhir/claim',
            value: uuidv4()
          }
        ],
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/claim-type",
              code: "institutional"
            }
          ]
        },
        use: this._getClaimUseType(formData, preAuthResponseId),
        item: formData.productOrService.map((item, idx) => ({
          sequence: idx + 1,
          productOrService: {
            coding: [
              {
                code: item.code,
                display: item.display,
                system: "https://qa-mis.apeiro-digital.com/fhir/CodeSystem/intervention-codes"
              }
            ]
          },
          servicedPeriod: {
            start: item.servicePeriod?.start,
            end: item.servicePeriod?.end
          },
          quantity: {
            value: Number(item.quantity?.value)
          },
          unitPrice: {
            value: Number(item.unitPrice?.value),
            currency: "KES"
          },
          factor: 1,
          net: {
            value: Number(item.net?.value),
            currency: "KES"
          }
        }))
      }
    };
  }

  _createRelatedPreAuthEntry(preAuthResponseId) {
    return [
              {
            claim: {
                identifier: {
                    system: "https://fhir.sha.go.ke/fhir/claim",
                    value: preAuthResponseId
                }
            },
            relationship: {
                coding: [
                    {
                        system: "https://fhir.sha.go.ke/fhir/CodeSystem/claim-relation-type",
                        code: "pre-auth"
                    }
                ],
                text: "Preauthorization"
            }
        }
    ];
  }
}

module.exports = new FhirClaimBundleService();