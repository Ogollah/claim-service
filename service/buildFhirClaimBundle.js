const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const {
  FHIR_SERVER,
  FHIR_RESOURCES,
  CLAIM_CONSTANTS
} = require('../utils/constants');

class FhirClaimBundleService {

  _getClaimUseType(formData, preAuthResponseId) {
    if ((formData.use === 'preauthorization' || formData.use === 'preauth-claim') && !preAuthResponseId) {
      return 'preauthorization';
    }
    if (preAuthResponseId || formData.use === 'claim' || formData.use === "related") {
      return 'claim';
    }
    return undefined;
  }

  transformFormToFhirBundle(formData, preAuthResponseId = null) {
    const relatedId = formData?.relatedClaimId;
    const response = preAuthResponseId;
    const resp = relatedId || response || null;
    console.log("preauth id", resp);
    
    // Create the base payload
    const transformedPayload = {
      meta: {
        profile: [
          `${FHIR_RESOURCES.IDENTIFIER_SYSTEMS.STRUCTURED_DEFINATION}/bundle|1.0.0`,
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
    transformedPayload.entry.push(this._createClaimEntry(formData, resp, response));
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
          reference: `${FHIR_SERVER.BASE_URL}/Patient/${patientData.id}`,
          type: "Patient"
        },
        resourceType: "Coverage"
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
        resourceType: "Organization",
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
        resourceType: "Patient",
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

  _createClaimEntry(formData, preAuthResponseId, response) {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];

    return {
      fullUrl: `${FHIR_SERVER.BASE_URL}/Claim/${uuidv4()}`,
      resource: {
        created: formData.billablePeriod.created,
        provider: {
          reference: `${FHIR_SERVER.BASE_URL}/Organization/${formData.provider.id}`
        },
        supportingInfo: [
          {
            sequence: 1,
            category: {
              coding: [
                {
                  system: `${FHIR_SERVER.TERMINOLOGY_URL}/CodeSystem/claiminformationcategory`,
                  code: "attachment",
                  display: "Attachment"
                }
              ]
            },
            valueAttachment: {
              language: "en",
              url: `${FHIR_SERVER.PROVIDER_URL}/media/edi/default.pdf`,
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
                  system: `${FHIR_SERVER.TERMINOLOGY_URL}/CodeSystem/claiminformationcategory`,
                  code: "attachment",
                  display: "Attachment"
                }
              ]
            },
            valueAttachment: {
              url: `${FHIR_SERVER.PROVIDER_URL}/media/edi/default.pdf`,
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
              system: `${FHIR_SERVER.TERMINOLOGY_URL}/CodeSystem/processpriority`,
              code: "normal"
            }
          ]
        },
        total: {
          value: Number(response ? formData.approvedAmount : formData.total.value),
          currency: "KES"
        },
        resourceType: "Claim",
        subType: {
          coding: [
            {
              system: `${FHIR_SERVER.TERMINOLOGY_URL}/CodeSystem/ex-claimsubtype`,
              code: formData.claimSubType
            }
          ]
        },
        patient: {
          reference: `${FHIR_SERVER.BASE_URL}/Patient/${formData.patient.id}`
        },
        billablePeriod: {
          start: response ? `${formatted}T10:40:22+03:00` : `${formData.billablePeriod.billableStart}T10:40:22+03:00`,
          end: response ? `${formatted}T10:40:22+03:00` : `${formData.billablePeriod.billableEnd}T12:00:47+03:00`
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
        related: preAuthResponseId ? this._createRelatedPreAuthEntry(formData.relatedClaimId || preAuthResponseId) : [],
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
                  value: Number(response ? formData.approvedAmount : formData.total.value),
                  currency: "KES"
                }
              },
              {
                url: `${FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patient-share`,
                valueMoney: {
                  value: Number(response ? formData.approvedAmount : formData.total?.value),
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
              system: `${FHIR_SERVER.TERMINOLOGY_URL}/CodeSystem/claim-type`,
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
                system: `${FHIR_SERVER.BASE_URL}/CodeSystem/intervention-codes`
              }
            ]
          },
          servicedPeriod: {
            start: response ? formatted : item.servicePeriod?.start,
            end: response ? formatted : item.servicePeriod?.end
          },
          quantity: {
            value: Number(item.quantity?.value)
          },
          unitPrice: {
            value: Number(response ? formData.approvedAmount : item.unitPrice?.value),
            currency: "KES"
          },
          factor: 1,
          net: {
            value: Number(response ? formData.approvedAmount : item.net?.value),
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
                    system: `${FHIR_SERVER.BASE_URL}/claim`,
                    value: preAuthResponseId
                }
            },
            relationship: {
                coding: [
                    {
                        system: `${FHIR_SERVER.BASE_URL}/CodeSystem/claim-relation-type`,
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