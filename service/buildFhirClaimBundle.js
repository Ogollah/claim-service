const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const {
  FHIR_SERVER,
  FHIR_RESOURCES,
  CLAIM_CONSTANTS
} = require('../utils/constants');
const { text } = require('body-parser');

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

  transformFormToFhirBundle(formData, preAuthResponseId = null, isDev = null) {

    const relatedId = formData?.relatedClaimId;
    const response = preAuthResponseId;
    const resp = relatedId || response || null;
    const is_dev = formData?.is_dev || isDev;
    const is_bundle_only = formData?.is_bundle_only;

    // Create the base payload
    const transformedPayload = {
      meta: {
        profile: [
          `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/bundle|1.0.0`,
        ]
      },
      timestamp: new Date().toISOString(),
      type: "message",
      entry: [],
      resourceType: "Bundle",
      id: !!is_bundle_only ? "{{$randomUUID}}" : uuidv4()
    };
    // Add entries for Coverage, Organization, Patient, and Claim
    transformedPayload.entry.push(this._createCoverageEntry(formData.patient, is_dev, is_bundle_only));
    transformedPayload.entry.push(this._createOrganizationEntry(formData.provider, is_dev));
    transformedPayload.entry.push(this._createPatientEntry(formData.patient, is_dev));
    transformedPayload.entry.push(this._createClaimEntry(formData, resp, response, is_dev, is_bundle_only));
    if (formData?.practitioner && Object.keys(formData.practitioner).length > 0) {
      transformedPayload.entry.push(this._createPractitionerEntry(formData.practitioner, is_dev));
    }
    const payload = JSON.parse(JSON.stringify(transformedPayload));


    return payload;
  }

  _createCoverageEntry(patientData, is_dev) {
    return {
      fullUrl: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Coverage/${patientData.id}-${FHIR_SERVER.VALUE_STRINGS.COVERAGE}`,
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
          reference: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Patient/${patientData.id}`,
          type: "Patient"
        },
        resourceType: "Coverage"
      }
    };
  }

  _createOrganizationEntry(providerData, is_dev) {
    return {
      fullUrl: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Organization/${providerData.id}`,
      resource: {
        identifier: [
          {
            use: 'official',
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/license/provider-license`,
            value: "PR-FHIR"
          }
        ],
        active: true,
        type: [
          {
            coding: [
              {
                system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/terminology/CodeSystem/organization-type`,
                code: "prov",
              }
            ]
          }
        ],
        resourceType: "Organization",
        id: providerData.id,
        meta: {
          profile: [
            `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/provider-organization|1.0.0`
          ]
        },
        name: providerData.name,
        extension: [
          {
            url: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/facility-level`,
            valueCodeableConcept: {
              coding: [
                {
                  system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/facility-level`,
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

  _createPatientEntry(patientData, is_dev) {
    const cleanNameParts = (patientData.name || '')
      .split(' ')
      .map(p => p.trim())
      .filter(p => p !== '');
    return {
      fullUrl: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Patient/${patientData.id}`,
      resource: {
        gender: patientData.gender,
        birthDate: patientData.birthDate,
        resourceType: "Patient",
        id: patientData.id,
        meta: {
          profile: [
            `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/patient|1.0.0`
          ]
        },
        identifier: [
          {
            use: 'official',
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/identifier/shanumber`,
            value: patientData.id
          },
          {
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value,
            use: 'official',
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/identifier/phonenumber`
          },
          {
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value,
            use: 'official',
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/identifier/nationalid`
          },
          {
            use: 'official',
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/identifier/other`,
            value: patientData.identifiers.find(i => i.system === 'NationalID')?.value
          }
        ],
        name: [
          {
            text: patientData.name || '',
            family: cleanNameParts.slice(-1)[0] || '',
            given: cleanNameParts.slice(0, -1)
          }
        ]
      }
    };
  }

  _createClaimEntry(formData, preAuthResponseId, response, is_dev, is_bundle_only) {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0];

    return {
      fullUrl: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Claim/${!!is_bundle_only ? "{{$randomUUID}}" : uuidv4()}`,
      resource: {
        created: formData.billablePeriod.created,
        provider: {
          reference: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Organization/${formData.provider.id}`
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
                        system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`,
                        code: "discharge-summary",
                        display: "Discharge Summary"
                      }
                    ]
                  },
                  url: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`
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
                  url: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`,
                  valueCodeableConcept: {
                    coding: [
                      {
                        system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/CodeSystem/attachment-type`,
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
        id: !!is_bundle_only ? "{{$randomUUID}}" : uuidv4(),
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
          reference: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Patient/${formData.patient.id}`
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
                  system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/terminology/CodeSystem/icd-10`,
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
                url: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patient-share`,
                valueMoney: {
                  value: Number(response ? formData.approvedAmount : formData.total?.value),
                  currency: "KES"
                }
              },
              {
                url: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patientInvoiceIdentifier`,
                valueIdentifier: {
                  system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/identifier/patientInvoice`,
                  value: `${formData.patient.id}-invoice-${is_bundle_only ? "{{$randomUUID}}" : uuidv4()}`
                }
              }
            ],
            url: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/extension-patientInvoice`
          }
        ],
        identifier: [
          {
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/claim`,
            value: !!is_bundle_only ? "{{$randomUUID}}" : uuidv4()
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
                system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/CodeSystem/intervention-codes`
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

  _createRelatedPreAuthEntry(preAuthResponseId, is_dev) {
    return [
      {
        claim: {
          identifier: {
            system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/claim`,
            value: preAuthResponseId
          }
        },
        relationship: {
          coding: [
            {
              system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/CodeSystem/claim-relation-type`,
              code: "pre-auth"
            }
          ],
          text: "Preauthorization"
        }
      }
    ];
  }

  _createPractitionerEntry(practitionerData, is_dev) {
    const identifiers = [];

    if (practitionerData.regNumber) {
      identifiers.push({
        use: 'official',
        system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Practitioner/PractitionerRegistrationNumber`,
        value: practitionerData.regNumber
      });
    }

    if (practitionerData.sladeCode) {
      identifiers.push({
        use: 'official',
        system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Practitioner/SladeCode`,
        value: practitionerData.sladeCode
      });
    }

    if (practitionerData.id) {
      identifiers.push({
        use: 'official',
        system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Practitioner/PractitionerRegistryID`,
        value: practitionerData.id
      });
    }

    if (practitionerData.nationalID) {
      identifiers.push({
        use: 'official',
        system: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Practitioner/National_ID`,
        value: practitionerData.nationalID
      });
    }

    const telecom = [];
    if (practitionerData.phone) {
      telecom.push({
        system: "phone",
        value: practitionerData.phone
      });
    }
    if (practitionerData.email) {
      telecom.push({
        system: "email",
        value: practitionerData.email
      });
    }

    return {
      fullUrl: `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/Practitioner/${practitionerData.id}`,
      resource: {
        resourceType: "Practitioner",
        id: practitionerData.id,
        meta: {
          profile: [
            `${is_dev ? FHIR_SERVER.DEV_URL : FHIR_SERVER.BASE_URL}/StructureDefinition/practitioner|1.0.0`
          ]
        },
        active: practitionerData.status ?? true,
        gender: practitionerData.gender,
        qualification: practitionerData.qualification
          ? [
            {
              code: {
                text: practitionerData.qualification
              }
            }
          ]
          : [],
        identifier: identifiers,
        name: [{
          text: practitionerData.name
        }],
        telecom: telecom.length ? telecom : undefined,
        address: practitionerData.address
          ? [
            {
              text: practitionerData.address
            }
          ]
          : undefined
      }
    };
  }

}

module.exports = new FhirClaimBundleService();