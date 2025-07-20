const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const {
  FHIR_SERVER,
  FHIR_RESOURCES,
  CLAIM_CONSTANTS
} = require('../utils/constants');

class FhirClaimBundleService {
  transformFormToFhirBundle(formData) {
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
    transformedPayload.entry.push(this._createClaimEntry(formData));
    const payload = JSON.parse(JSON.stringify(transformedPayload));

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
            valueString: `${FHIR_SERVER.VALUE_STRINGS.CAT_SHA}`
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
          reference: `${FHIR_RESOURCES.PATIENT}/${patientData.id}`,
          type: "Patient"
        },
        resourceType: `${FHIR_SERVER.PATHS.COVERAGE}`,
      }
    };
  }

  _createOrganizationEntry(providerData) {
    return {
      fullUrl: `${FHIR_SERVER.BASE_URL}/Organization/${providerData.id}`,
      resource: {
        identifier: [
          {
            use: 'official',
            system: `${FHIR_SERVER.BASE_URL}/license/provider-license`,
            value: "PR-FHIR"
          }
        ],
        active: true,
        type: [
          {
            coding: [
              {
                system: `${FHIR_SERVER.BASE_URL}/terminology/CodeSystem/organization-type`,
                code: "prov",
              }
            ]
          }
        ],
        resourceType: `${FHIR_SERVER.PATHS.ORGANIZATION}`,
        id: providerData.id,
        meta: {
          profile: [
            `${FHIR_SERVER.BASE_URL}/StructureDefinition/provider-organization|1.0.0`
          ]
        },
        name: providerData.name,
        extension: [
          {
            url: `${FHIR_SERVER.BASE_URL}/StructureDefinition/facility-level`,
            valueCodeableConcept: {
              coding: [
                {
                  system: `${FHIR_SERVER.BASE_URL}/StructureDefinition/facility-level`,
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
      fullUrl: `${FHIR_SERVER.BASE_URL}/Patient/${patientData.id}`,
      resource: {
        gender: patientData.gender,
        birthDate: patientData.birthDate,
        resourceType: `${FHIR_SERVER.PATHS.PATIENT}`,
        id: patientData.id,
        meta: {
          profile: [
            `${FHIR_SERVER.BASE_URL}/StructureDefinition/patient|1.0.0`
          ]
        },
        identifier: [
          {
            use: 'official',
            system: `${FHIR_SERVER.BASE_URL}/identifier/shanumber`,
            value: patientData.id
          },
          {
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value,
            use: 'official',
            system: `${FHIR_SERVER.BASE_URL}/identifier/phonenumber`
          },
          {
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value,
            use: 'official',
            system: `${FHIR_SERVER.BASE_URL}/identifier/nationalid`
          },
          {
            use: 'official',
            system: `${FHIR_SERVER.BASE_URL}/identifier/other`,
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

  _createClaimEntry(formData) {
    return {
      fullUrl: `${FHIR_SERVER.BASE_URL}/${FHIR_SERVER.PATHS.CLAIM}/${uuidv4()}`,
      resource: {
        created: formData.billablePeriod.created,
        provider: {
          reference: `${FHIR_SERVER.BASE_URL}/${FHIR_SERVER.PATHS.ORGANIZATION}/${formData.provider.id}`
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
                        system: `${FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`,
                        code: "discharge-summary",
                        display: "Discharge Summary"
                      }
                    ]
                  },
                  url: `${FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`
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
                  url: `${FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`,
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: `${FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`,
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
              code: "ip"
            }
          ]
        },
        patient: {
          reference: `${FHIR_SERVER.BASE_URL}/${FHIR_SERVER.BASE_URL.PATIENT}/${formData.patient.id}`
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
                  system: `${FHIR_SERVER.BASE_URL}/terminology/CodeSystem/icd-10`,
                  code: "BC00",
                  display: "Multiple valve disease"
                }
              ]
            }
          }
        ],
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
                url: `${FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patient-share`,
                valueMoney: {
                  value: Number(formData.total?.value),
                  currency: "KES"
                }
              },
              {
                url: `${FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patientInvoiceIdentifier`,
                valueIdentifier: {
                  system: `${FHIR_SERVER.BASE_URL}/identifier/patientInvoice`,
                  value: `${formData.patient.id}-invoice-${uuidv4()}`
                }
              }
            ],
            url: `${FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patientInvoice`
          }
        ],
        identifier: [
          {
            system: `${FHIR_SERVER.BASE_URL}/claim`,
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
        use: "claim",
        item: formData.productOrService.map((item, idx) => ({
          sequence: idx + 1,
          productOrService: {
            coding: [
              {
                code: item.code,
                display: item.display,
                system: `${FHIR_SERVER.BASE_URL}/CodeSystem/intervention-codes`
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
}

module.exports = new FhirClaimBundleService();